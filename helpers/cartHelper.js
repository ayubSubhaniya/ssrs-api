const mustache = require('mustache');

const Service = require('../models/service');
const CollectionType = require('../models/collectionType');
const UserInfo = require('../models/userInfo');
const User = require('../models/user');
const Order = require('../models/order');
const Collector = require('../models/collector');
const CourierInfo = require('../models/courierInfo');
const PlacedCart = require('../models/placedCart');
const Cart = require('../models/cart');
const PlacedOrder = require('../models/placedOrder');

const { validateOrder } = require('../helpers/orderHelper');
const {  getIdsFromDoc } = require('../helpers/controllerHelpers');
const {
    orderStatus,
    cartStatus,
    systemAdmin,
    placedCartAttributes,
    placedOrderAttributes,
    placedOrderServiceAttributes,
    placedOrderParameterAttributes,
} = require('../configuration');
const errorMessages = require('../configuration/errors');
const { convertToStringArray, filterResourceData } = require('../helpers/controllerHelpers');

const {
    generateCartStatusChangeNotification,
    updateCartIdInNotification,
    generateCustomNotification
} = require('../helpers/notificationHelper');

const { sendMail } = require('../configuration/mail'),
    mailTemplates = require('../configuration/mailTemplates.json');

const removeCart = async (cart, populated) => {
    let message = 'Your cart has became invalid. Please try placing new order!';
    await Cart.findByIdAndRemove(cart._id);

    if (cart.pickup) {
        await Collector.findByIdAndRemove(populated ? cart.pickup.id : cart.pickup);
    } else if (cart.delivery) {
        await CourierInfo.findByIdAndRemove(populated ? cart.delivery.id : cart.delivery);
    }

    /* Add notification here*/
    const notification = generateCustomNotification(cart.requestedBy, systemAdmin, message);
    await notification.save();
};

const calculateCollectionTypeCost = async (collectionType, orders, collectionTypeCategory, populatedCart = false, populatedOrder = false, allowNoCollectionType = false) => {
    if (collectionType === undefined) {
        return allowNoCollectionType ? 0 : -1;
    }

    let collectionTypeDoc;
    if (populatedCart) {
        collectionTypeDoc = collectionType;
    } else {
        collectionTypeDoc = await CollectionType.findOne({ _id: collectionType });
    }

    if (!collectionTypeDoc) {
        return -1;
    }
    if (!collectionTypeDoc.isActive) {
        return -1;
    }

    if (collectionTypeCategory !== undefined && collectionTypeDoc.category !== collectionTypeCategory) {
        return -1;
    }

    for (let i = 0; i < orders.length; i++) {
        let service;
        if (populatedOrder) {
            service = orders[i].service;
        } else {
            service = await Service.findById(orders[i].service);
        }
        let collectionTypes = [];
        if (populatedOrder){
            collectionTypes = getIdsFromDoc(service.collectionTypes);
        } else {
            collectionTypes = convertToStringArray(service.collectionTypes);
        }

        if (!collectionTypes.includes(collectionTypeDoc._id.toString())) {
            return -1;
        }
    }

    return collectionTypeDoc.baseCharge;
};

const calculateOrdersCost = async (cart) => {
    if (!cart){
        return -1;
    }
    let cost = 0;
    const { orders } = cart;
    for (let i = 0; i < orders.length; i++) {
        if (orders[i].status < orderStatus.unplaced) {
            return -1;
        } else {
            cost += orders[i].totalCost;
        }
    }
    return cost;
};

const checkPaymentMode = async (cart, paymentMode) => {
    if (!cart){
        return -1;
    }
    //paymentMode = paymentMode.toLowerCase();
    const { orders } = cart;
    for (let i = 0; i < orders.length; i++) {
        const service = await Service.findById(orders[i].service);
        if (!service.availablePaymentModes.includes(paymentMode)) {
            return false;
        }
    }
    return true;
};

const validateCart = async (cart, user, populatedCart = false, populatedOrder = false, allowNoCollectionType = false) => {
    if (!cart){
        return null;
    }
    const oldStatus = cart.status;

    cart.orders = await validateOrder(cart.orders, user, populatedOrder);
    if (cart.orders.length === 0 && oldStatus > cartStatus.unplaced) {
        cart.status = cartStatus.invalid;
    }

    cart.ordersCost = await calculateOrdersCost(cart);
    cart.collectionTypeCost = await calculateCollectionTypeCost(cart.collectionType, cart.orders, cart.collectionTypeCategory, populatedCart, populatedOrder, allowNoCollectionType);

    if (cart.ordersCost === -1) {
        cart.status = cartStatus.invalid;
        cart.validityErrors.push(errorMessages.invalid);
    }

    if (cart.collectionTypeCost === -1) {
        cart.status = cartStatus.invalid;
        cart.validityErrors.push(errorMessages.invalidCollectionType);
    }

    if (cart.status === cartStatus.invalid) {

        if (oldStatus > cartStatus.unplaced) {
            await removeCart(cart, populatedCart);
            return null
        }

        cart.totalCost = -1;
    } else {
        cart.totalCost = cart.collectionTypeCost + cart.ordersCost;
    }
    return cart;
};

const generateOrderPlacedMailAndNotification = async (user, oldCart, newCart) => {
    const notification = generateCartStatusChangeNotification(user.daiictId, systemAdmin, newCart.orders.length, newCart.status, '-', newCart.id);
    await notification.save();


    /* Update all notification with old cartID */
    await updateCartIdInNotification(oldCart.id, newCart.id);

    let mailTo = (await UserInfo.findOne({ user_inst_id: newCart.requestedBy })).user_email_id;
    let cc = mailTemplates['orderPlaced'].cc;
    let bcc = mailTemplates['orderPlaced'].bcc;
    let mailSubject = mailTemplates['orderPlaced'].subject;
    let options = {
        orderId: newCart.orderId,
        cartLength: newCart.orders.length,
        totalCost: newCart.totalCost,
        paymentCode: newCart.paymentCode
    };
    let mailBody = mustache.render(mailTemplates['orderPlaced'].body, options);

    await sendMail(mailTo, cc, bcc, mailSubject, mailBody);
};

const generateEasyPayPaymentMailAndNotification = async (success, oldCart, newCart) => {
    let templateName = 'successfulEasyPayPayment';
    if (!success){
        templateName = 'failedEasyPayPayment';
        newCart = oldCart;
    }

    const notification = generateCartStatusChangeNotification(newCart.requestedBy, systemAdmin, newCart.orders.length, newCart.status, '-', newCart.id);
    await notification.save();

    if (success){
        /* Update all notification with old cartID */
        await updateCartIdInNotification(oldCart.id, newCart.id);
    }

    let mailTo = (await UserInfo.findOne({ user_inst_id: newCart.requestedBy })).user_email_id;
    const {cc, bcc, mailSubject} = mailTemplates[templateName];
    let options = {
        orderId: newCart.orderId,
        cartLength: newCart.orders.length,
        paymentId: newCart.paymentId
    };
    let mailBody = mustache.render(mailTemplates[templateName].body, options);

    await sendMail(mailTo, cc, bcc, mailSubject, mailBody);
};

const getValidCartPaymentError = async (cart, paymentType) => {
    if (cart.collectionTypeCost === -1) {
        return errorMessages.invalidCollectionType;
    }

    if (cart.orders.length === 0) {
        return errorMessages.noOrdersInCart;
    }
    if (cart.ordersCost === -1) {
        return errorMessages.invalid;
    }

    if (cart.delivery === undefined && cart.pickup === undefined) {
        return errorMessages.noCollectionType;
    }

    if (!(cart.totalCost===0||(await checkPaymentMode(cart, paymentType)))) {
        return errorMessages.invalidPaymentType;
    }
    return null;
};

const generateNewCartForUser = async (user) => {
    const cart = new Cart({
        requestedBy: user.daiictId,
        createdOn: user.createdOn,
    });
    await cart.save();

    user.cartId = cart._id;
    await user.save();
};

const removeCartAndOrders = async (cart, populated = false) => {
    for (let i = 0; i < cart.orders.length; i++) {
        if (populated) {
            await Order.findByIdAndRemove(cart.orders[i].id);
        } else {
            await Order.findByIdAndRemove(cart.orders[i]);
        }

    }
    await Cart.findByIdAndRemove(cart.id);
};

const convertToPlacedCart = async (cart, isStatusProcessing = false) => {
    const placedCartDoc = filterResourceData(cart, placedCartAttributes);
    const placedCart = new PlacedCart(placedCartDoc);

    for (let i = 0; i < cart.orders.length; i++) {
        cart.orders[i].status = orderStatus.placed;
        cart.orders[i].statusChangeTime.placed = {
            time: new Date(),
            by: systemAdmin
        };

        if (isStatusProcessing) {
            cart.orders[i].status = orderStatus.processing;
            cart.orders[i].statusChangeTime.processing = {
                time: new Date(),
                by: systemAdmin
            };
        }

        const placedOrderDoc = filterResourceData(cart.orders[i], placedOrderAttributes);
        placedOrderDoc.service = filterResourceData(placedOrderDoc.service, placedOrderServiceAttributes);
        placedOrderDoc.parameters = filterResourceData(placedOrderDoc.parameters, placedOrderParameterAttributes);
        placedOrderDoc.orderId = cart.orders[i]._id;
        placedOrderDoc.cartId = placedCart._id;

        const placedOrder = new PlacedOrder(placedOrderDoc);
        await placedOrder.save();

        placedCart.orders[i] = placedOrder._id;
    }

    placedCart.status = cart.status;

    return await placedCart.save();
};

module.exports = {
    calculateCollectionTypeCost,
    calculateOrdersCost,
    checkPaymentMode,
    validateCart,
    generateOrderPlacedMailAndNotification,
    generateEasyPayPaymentMailAndNotification,
    getValidCartPaymentError,
    generateNewCartForUser,
    removeCartAndOrders,
    convertToPlacedCart
};
