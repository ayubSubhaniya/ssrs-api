const httpStatusCodes = require('http-status-codes');
const nodeSchedule = require('node-cron');
const mustache = require('mustache');

const { orderNoGeneratorSecret } = require('../configuration');
const orderid = require('order-id')(orderNoGeneratorSecret);

const { logger } = require('../configuration/logger');
const Service = require('../models/service');
const Delivery = require('../models/delivery');
const Collector = require('../models/collector');
const Order = require('../models/order');
const PlacedOrder = require('../models/placedOrder');
const PlacedCart = require('../models/placedCart');
const Cart = require('../models/cart');
const UserInfo = require('../models/userInfo');
const CollectionType = require('../models/collectionType');
const EasyPayPaymentInfo = require('../models/easyPayPaymentInfo');

const paymentCodeGenerator = require('shortid');
paymentCodeGenerator.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@$');

const { generateCartStatusChangeNotification, generatePendingPaymentNotification } = require('../helpers/notificationHelper');
const { encryptUrl, decryptUrl, createSHASig } = require('../helpers/crypto');
const { generateInvoice } = require('../helpers/invoiceMaker');
const { filterResourceData, parseSortQuery, parseFilterQuery, convertToStringArray } = require('../helpers/controllerHelpers');
const { accessControl } = require('./access');
const { adminTypes, userTypes, homePage, easyPaySuccessResponse, systemAdmin, resources, collectionTypes, sortQueryName, paymentTypes, cartStatus, orderStatus, collectionStatus, placedOrderAttributes, placedOrderServiceAttributes, placedCartAttributes, ORDER_CANCEL_TIME_IN_PAYMENT_DELAY, CHECK_FOR_OFFLINE_PAYMENT } = require('../configuration');
const errorMessages = require('../configuration/errors');
const { validateOrder } = require('./order');
const { sendMail } = require('../configuration/mail'),
    mailTemplates = require('../configuration/mailTemplates.json');

//const dayToMilliSec = 86400000;
const checkForOfflinePayment = async () => {

    const failedOrderTime = new Date();
    failedOrderTime.setDate(failedOrderTime.getDate() - ORDER_CANCEL_TIME_IN_PAYMENT_DELAY);

    const carts = await Cart.find({
        status: cartStatus.placed,
    });

    for (let i = 0; i < carts.length; i++) {
        if (carts[i].statusChangeTime.placed <= failedOrderTime) {
            await Cart.findByIdAndUpdate(carts[i]._id, {
                status: cartStatus.cancelled,
                cancelReason: 'Payment delay',
                '$set': {
                    'statusChangeTime.cancelled': {
                        time: new Date(),
                        by: systemAdmin
                    }
                }
            });

            let mailTo = (await UserInfo.findOne({ user_inst_id: carts[i].requestedBy })).user_email_id;
            let cc = mailTemplates['orderCancel-PaymentDelay'].cc;
            let bcc = mailTemplates['orderCancel-PaymentDelay'].bcc;
            let mailSubject = mailTemplates['orderCancel-PaymentDelay'].subject;
            let options = {
                orderId: carts[i].orderId,
                cartLength: carts[i].orders.length
            };
            let mailBody = mustache.render(mailTemplates['orderCancel-PaymentDelay'].body, options);
            await sendMail(mailTo, cc, bcc, mailSubject, mailBody);

            /*Generate notification for cancel*/
            const notification = generateCartStatusChangeNotification(carts[i].requestedBy, systemAdmin, carts[i].orders.length, cartStatus.cancelled, carts[i].cancelReason);
            await notification.save();

        } else {

            const cancelledInDays = carts[i].statusChangeTime.processingPayment.getDate() + ORDER_CANCEL_TIME_IN_PAYMENT_DELAY - new Date().getDate();

            let mailTo = (await UserInfo.findOne({ user_inst_id: carts[i].requestedBy })).user_email_id;
            let cc = mailTemplates['paymentPendingOffline'].cc;
            let bcc = mailTemplates['paymentPendingOffline'].bcc;
            let mailSubject = mailTemplates['paymentPendingOffline'].subject;
            let options = {
                orderId: carts[i].orderId,
                cartLength: carts[i].orders.length,
                cancelledInDays,
                paymentCode: carts[i].paymentCode
            };
            let mailBody = mustache.render(mailTemplates['paymentPendingOffline'].body, options);
            await sendMail(mailTo, cc, bcc, mailSubject, mailBody);

            /*Generate notification for payment*/
            const notification = generatePendingPaymentNotification(carts.requestedBy, systemAdmin, carts.orders.length, 'offline');
            await notification.save();
        }
    }
};

const checkForFailedOnlinePayment = async () => {

    const failedOrderTime = new Date();
    failedOrderTime.setDate(failedOrderTime.getDate() - ORDER_CANCEL_TIME_IN_PAYMENT_DELAY);

    const carts = await Cart.find({
        status: cartStatus.processingPayment,
    });

    for (let i = 0; i < carts.length; i++) {
        if (carts[i].statusChangeTime.processingPayment <= failedOrderTime) {
            await Cart.findByIdAndUpdate(carts[i]._id, {
                status: cartStatus.cancelled,
                cancelReason: 'Payment delay',
                '$set': {
                    'statusChangeTime.cancelled': {
                        time: new Date(),
                        by: systemAdmin
                    }
                }
            });

            let mailTo = (await UserInfo.findOne({ user_inst_id: carts[i].requestedBy })).user_email_id;
            let cc = mailTemplates['orderCancel-PaymentDelay'].cc;
            let bcc = mailTemplates['orderCancel-PaymentDelay'].bcc;
            let mailSubject = mailTemplates['orderCancel-PaymentDelay'].subject;
            let options = {
                orderId: carts[i].orderId,
                cartLength: carts[i].orders.length
            };
            let mailBody = mustache.render(mailTemplates['orderCancel-PaymentDelay'].body, options);
            await sendMail(mailTo, cc, bcc, mailSubject, mailBody);

            /*Generate notification for cancel*/
            const notification = generateCartStatusChangeNotification(carts[i].requestedBy, systemAdmin, carts[i].orders.length, cartStatus.cancelled, carts[i].cancelReason);
            await notification.save();
        } else {
            const cancelledInDays = carts[i].statusChangeTime.processingPayment.getDate() + ORDER_CANCEL_TIME_IN_PAYMENT_DELAY - new Date().getDate();

            let mailTo = (await UserInfo.findOne({ user_inst_id: carts[i].requestedBy })).user_email_id;
            let cc = mailTemplates['paymentPendingOnline'].cc;
            let bcc = mailTemplates['paymentPendingOnline'].bcc;
            let mailSubject = mailTemplates['paymentPendingOnline'].subject;
            let options = {
                orderId: carts[i].orderId,
                cartLength: carts[i].orders.length,
                cancelledInDays,
                paymentCode: carts[i].paymentCode
            };
            let mailBody = mustache.render(mailTemplates['paymentPendingOnline'].body, options);
            await sendMail(mailTo, cc, bcc, mailSubject, mailBody);

            /*Generate notification for payment*/
            const notification = generatePendingPaymentNotification(carts.requestedBy, systemAdmin, carts.orders.length, 'online');
            await notification.save();
        }
    }
};

nodeSchedule.schedule('0 3 * * *', async () => {
    await checkForFailedOnlinePayment();
    await checkForOfflinePayment();
});

// setInterval(checkForOfflinePayment, CHECK_FOR_OFFLINE_PAYMENT * dayToMilliSec);
// setInterval(checkForFailedOnlinePayment, CHECK_FOR_OFFLINE_PAYMENT * dayToMilliSec);

const getMandatoryEasyPayFields = (cart) => {
    return `${cart.paymentCode}|${process.env.submerchantid}|${cart.totalCost}`;
};

const getEasyPayUrl = (cart) => {
    let url = process.env.url + '?';
    url += 'merchantid=' + process.env.merchantid;
    url += '&mandatory fields=' + getMandatoryEasyPayFields(cart);
    url += '&optional fields=';
    url += '&returnurl=' + process.env.returnurl;
    url += '&Reference No=' + cart.paymentCode;
    url += '&submerchantid=' + process.env.submerchantid;
    url += '&transaction amount=' + cart.totalCost;
    url += '&paymode=' + process.env.paymode;
    return encryptUrl(url);
};


const calculateCollectionTypeCost = async (collectionType, orders, collectionTypeCategory) => {
    if (collectionType === undefined) {
        return -1;
    }
    const collectionTypeDoc = await CollectionType.findOne({ _id: collectionType });

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
        const service = await Service.findById(orders[i].service);
        const collectionTypes = convertToStringArray(service.collectionTypes);

        if (!collectionTypes.includes(collectionTypeDoc._id.toString())) {
            return -1;
        }
    }

    return collectionTypeDoc.baseCharge;
};

const calculateOrdersCost = async (cart) => {
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

module.exports = {
    getMyCart: async (req, res, next) => {

        const { user } = req;
        const { cartId } = user;

        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);
        const readAnyServicePermission = accessControl.can(user.userType)
            .readAny(resources.service);
        const readAnyParameterPermission = accessControl.can(user.userType)
            .readAny(resources.parameter);
        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);
        const readOwnCourierPermission = accessControl.can(user.userType)
            .readOwn(resources.delivery);
        const readOwnPickupPermission = accessControl.can(user.userType)
            .readOwn(resources.collector);

        if (readOwnCartPermission.granted && user.userType === userTypes.student) {

            const cart = await Cart.findById(cartId)
                .deepPopulate(['orders.service', 'orders.parameters', 'delivery', 'pickup'], {
                    populate: {
                        'orders': {
                            select: readOwnOrderPermission.attributes
                        },
                        'delivery': {
                            select: readOwnCourierPermission.attributes
                        },
                        'pickup': {
                            select: readOwnPickupPermission.attributes
                        },
                        'orders.service': {
                            select: readAnyServicePermission.attributes
                        },
                        'orders.parameters': {
                            select: readAnyParameterPermission.attributes
                        }
                    }
                });

            cart.orders = await validateOrder(cart.orders, user);

            const ordersCost = await calculateOrdersCost(cart);
            if (ordersCost === -1) {
                cart.status = cartStatus.invalid;
                cart.validityErrors.push(errorMessages.invalid);
            } else {
                cart.ordersCost = ordersCost;
            }

            const collectionTypeCost = await calculateCollectionTypeCost(cart.collectionType, cart.orders);

            if (collectionTypeCost === -1) {
                cart.status = cartStatus.invalid;
                cart.validityErrors.push(errorMessages.invalidCollectionType);
            } else {
                cart.collectionTypeCost = collectionTypeCost;
            }

            cart.totalCost = cart.collectionTypeCost + cart.ordersCost;

            const filteredCart = await filterResourceData(cart, readOwnCartPermission.attributes);
            res.status(httpStatusCodes.OK)
                .json({ cart: filteredCart });
        } else {
            return res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    getCart: async (req, res, next) => {

        const { user } = req;
        const { daiictId } = user;
        const { cartId } = req.params;

        const readAnyOrderPermission = accessControl.can(user.userType)
            .readAny(resources.order);
        const readAnyCartPermission = accessControl.can(user.userType)
            .readAny(resources.cart);
        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);
        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);
        const readAnyServicePermission = accessControl.can(user.userType)
            .readAny(resources.service);
        const readAnyParameterPermission = accessControl.can(user.userType)
            .readAny(resources.parameter);
        const readOwnCourierPermission = accessControl.can(user.userType)
            .readOwn(resources.delivery);
        const readOwnPickupPermission = accessControl.can(user.userType)
            .readOwn(resources.collector);
        const readAnyCourierPermission = accessControl.can(user.userType)
            .readAny(resources.delivery);
        const readAnyPickupPermission = accessControl.can(user.userType)
            .readAny(resources.collector);

        if (readAnyCartPermission.granted) {
            const cart = await Cart.findById(cartId)
                .deepPopulate(['orders.service', 'orders.parameters', 'delivery', 'pickup'], {
                    populate: {
                        'orders': {
                            select: readAnyOrderPermission.attributes
                        },
                        'delivery': {
                            select: readAnyCourierPermission.attributes
                        },
                        'pickup': {
                            select: readAnyPickupPermission.attributes
                        },
                        'orders.service': {
                            select: readAnyServicePermission.attributes
                        },
                        'orders.parameters': {
                            select: readAnyParameterPermission.attributes
                        }
                    }
                });

            if (!cart) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            }

            if (cart.status >= cartStatus.placed) {
                const filteredCart = await filterResourceData(cart, readAnyCartPermission.attributes);
                res.status(httpStatusCodes.OK)
                    .json({ cart: filteredCart });
            } else {
                res.sendStatus(httpStatusCodes.FORBIDDEN);
            }
        } else if (readOwnCartPermission.granted) {
            const cart = await Cart.findOne({
                _id: cartId,
                requestedBy: daiictId
            })
                .deepPopulate(['orders.service', 'orders.parameters', 'delivery', 'pickup'], {
                    populate: {
                        'orders': {
                            select: readOwnOrderPermission.attributes
                        },
                        'delivery': {
                            select: readOwnCourierPermission.attributes
                        },
                        'pickup': {
                            select: readOwnPickupPermission.attributes
                        },
                        'orders.service': {
                            select: readAnyServicePermission.attributes
                        },
                        'orders.parameters': {
                            select: readAnyParameterPermission.attributes
                        }
                    }
                });

            if (!cart) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            }

            if (cart.status > cartStatus.unplaced) {

                if (cart.status < cartStatus.placed) {

                    cart.orders = await validateOrder(cart.orders, user);

                    const ordersCost = await calculateOrdersCost(cart);
                    if (ordersCost === -1) {
                        cart.status = cartStatus.invalid;
                        cart.validityErrors.push(errorMessages.invalid);
                    } else {
                        cart.ordersCost = ordersCost;
                    }

                    const collectionTypeCost = await calculateCollectionTypeCost(cart.collectionType, cart.orders);

                    if (collectionTypeCost === -1) {
                        cart.status = cartStatus.invalid;
                        cart.validityErrors.push(errorMessages.invalidCollectionType);
                    } else {
                        cart.collectionTypeCost = collectionTypeCost;
                    }

                    cart.totalCost = cart.collectionTypeCost + cart.ordersCost;
                }

                const filteredCart = await filterResourceData(cart, readOwnCartPermission.attributes);

                res.status(httpStatusCodes.OK)
                    .json({ cart: filteredCart });
            } else {
                res.sendStatus(httpStatusCodes.FORBIDDEN);
            }
        } else {
            return res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    getAllCart: async (req, res, next) => {

        const { user } = req;
        const { daiictId } = user;

        const readAnyCartPermission = accessControl.can(user.userType)
            .readAny(resources.cart);
        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);
        const readAnyServicePermission = accessControl.can(user.userType)
            .readAny(resources.service);
        const readAnyParameterPermission = accessControl.can(user.userType)
            .readAny(resources.parameter);

        let query = {};
        let sortQuery = {};
        let cartAttributesPermission = {};
        let orderAttributesPermission = {};
        let pickupAttributesPermission = {};
        let courierAttributesPermission = {};

        if (readAnyCartPermission.granted) {
            query = parseFilterQuery(req.query, readAnyCartPermission.attributes);
            if (query.status !== undefined) {
                if (query.status < cartStatus.placed) {
                    query.status = -1;
                }
            } else {
                query.status = {
                    $gte: cartStatus.placed
                };
            }

            sortQuery = parseSortQuery(req.query[sortQueryName], readAnyCartPermission.attributes);

            cartAttributesPermission = readAnyCartPermission.attributes;
            orderAttributesPermission = accessControl.can(user.userType)
                .readAny(resources.order).attributes;
            courierAttributesPermission = accessControl.can(user.userType)
                .readAny(resources.delivery).attributes;
            pickupAttributesPermission = accessControl.can(user.userType)
                .readAny(resources.collector).attributes;

        } else if (readOwnCartPermission.granted) {
            query = parseFilterQuery(req.query, readOwnCartPermission.attributes);
            if (query.status !== undefined) {
                if (query.status < cartStatus.unplaced) {
                    query.status = -1;
                }
            } else {
                query.status = {
                    $gt: cartStatus.unplaced
                };
            }
            sortQuery = parseSortQuery(req.query[sortQueryName], readOwnCartPermission.attributes);
            query.requestedBy = daiictId;

            cartAttributesPermission = readOwnCartPermission.attributes;
            orderAttributesPermission = accessControl.can(user.userType)
                .readOwn(resources.order).attributes;
            courierAttributesPermission = accessControl.can(user.userType)
                .readOwn(resources.delivery).attributes;
            pickupAttributesPermission = accessControl.can(user.userType)
                .readOwn(resources.collector).attributes;

        } else {
            return res.sendStatus(httpStatusCodes.FORBIDDEN);
        }

        const cart = await Cart.find(query)
            .sort(sortQuery)
            .deepPopulate(['orders.service', 'orders.parameters', 'delivery', 'pickup'], {
                populate: {
                    'orders': {
                        select: orderAttributesPermission
                    },
                    'delivery': {
                        select: courierAttributesPermission
                    },
                    'pickup': {
                        select: pickupAttributesPermission
                    },
                    'orders.service': {
                        select: readAnyServicePermission.attributes
                    },
                    'orders.parameters': {
                        select: readAnyParameterPermission.attributes
                    }
                }
            });

        /*for (let i = 0; i < cart.length; i++) {
            if (cart[i].status < cartStatus.placed) {
                cart[i].orders = await validateOrder(cart[i].orders, user);

                const ordersCost = await calculateOrdersCost(cart[i]);
                if (ordersCost === -1) {
                    cart[i].status = cartStatus.invalid;
                    cart[i].validityErrors.push(errorMessages.invalid);
                } else {
                    cart[i].ordersCost = ordersCost;
                }

                const collectionTypeCost = await calculateCollectionTypeCost(cart[i].collectionType, cart[i].orders);

                if (collectionTypeCost === -1) {
                    cart[i].status = cartStatus.invalid;
                    cart[i].validityErrors.push(errorMessages.invalidCollectionType);
                } else {
                    cart[i].collectionTypeCost = collectionTypeCost;
                }

                cart[i].totalCost = cart[i].collectionTypeCost + cart[i].ordersCost;
            }
        }*/

        const filteredCart = await filterResourceData(cart, cartAttributesPermission);
        res.status(httpStatusCodes.OK)
            .json({ cart: filteredCart });
    },

    addDelivery: async (req, res, next) => {
        const { user } = req;
        const { daiictId, cartId } = user;
        const { collectionType } = req.params;
        const timeStamp = new Date();

        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);
        const readOwnCourierPermission = accessControl.can(user.userType)
            .readOwn(resources.delivery);
        const updateOwnCartPermission = accessControl.can(user.userType)
            .updateOwn(resources.cart);
        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        if (updateOwnCartPermission.granted && user.userType === userTypes.student) {
            const delivery = new Delivery(req.value.body);
            delivery.createdOn = timeStamp;
            delivery.createdBy = daiictId;

            const cart = await Cart.findById(cartId)
                .populate({
                    path: 'orders',
                    select: readOwnOrderPermission.attributes
                });

            if (!cart) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            } else if (cart.status === cartStatus.unplaced) {

                cart.orders = await validateOrder(cart.orders, user);

                const ordersCost = await calculateOrdersCost(cart);
                if (ordersCost === -1) {
                    cart.status = cartStatus.invalid;
                    cart.validityErrors.push(errorMessages.invalid);
                } else {
                    cart.ordersCost = ordersCost;
                }

                const cost = await calculateCollectionTypeCost(collectionType, cart.orders, collectionTypes.delivery);
                if (cost === -1) {
                    res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCollectionType);
                    return;
                }


                cart.collectionTypeCost = cost;
                cart.totalCost = cart.collectionTypeCost + cart.ordersCost;

                cart.pickup = undefined;

                cart.collectionType = collectionType;
                cart.collectionTypeCategory = collectionTypes.delivery;
                cart.delivery = delivery._id;
                delivery.cartId = cart._id;

                const newDelivery = await delivery.save();
                const newCart = await cart.save();

                const filteredDelivery = filterResourceData(newDelivery, readOwnCourierPermission.attributes);
                const filteredCart = filterResourceData(newCart, readOwnCartPermission.attributes);
                res.status(httpStatusCodes.CREATED)
                    .json({
                        cart: filteredCart,
                        delivery: filteredDelivery
                    });

            } else {
                return res.sendStatus(httpStatusCodes.FORBIDDEN);
            }

        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    updateCourier: async (req, res, next) => {
        const { user } = req;
        const { daiictId, cartId } = user;
        const { collectionType } = req.params;

        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);
        const readOwnCourierPermission = accessControl.can(user.userType)
            .readOwn(resources.delivery);
        const updateOwnCartPermission = accessControl.can(user.userType)
            .updateOwn(resources.cart);
        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        if (updateOwnCartPermission.granted && user.userType === userTypes.student) {
            const delivery = req.value.body;

            const cart = await Cart.findById(cartId)
                .populate({
                    path: 'orders',
                    select: readOwnOrderPermission.attributes
                });

            if (!cart || !cart.delivery) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            } else if (cart.status === cartStatus.unplaced) {

                cart.orders = await validateOrder(cart.orders, user);

                const ordersCost = await calculateOrdersCost(cart);
                if (ordersCost === -1) {
                    cart.status = cartStatus.invalid;
                    cart.validityErrors.push(errorMessages.invalid);
                } else {
                    cart.ordersCost = ordersCost;
                }


                const cost = await calculateCollectionTypeCost(collectionType, cart.orders, collectionTypes.delivery);
                if (cost === -1) {
                    res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCollectionType);
                    return;
                }

                cart.collectionType = collectionType;
                cart.collectionTypeCost = cost;
                cart.totalCost = cart.collectionTypeCost + cart.ordersCost;

                const newDelivery = await Delivery.findByIdAndUpdate(cart.delivery, delivery, { new: true });
                /* check if delivery is present*/
                const newCart = await cart.save();

                const filteredDelivery = filterResourceData(newDelivery, readOwnCourierPermission.attributes);
                const filteredCart = filterResourceData(newCart, readOwnCartPermission.attributes);
                res.status(httpStatusCodes.OK)
                    .json({
                        cart: filteredCart,
                        delivery: filteredDelivery
                    });

            } else {
                res.sendStatus(httpStatusCodes.FORBIDDEN);
            }


        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    addPickup: async (req, res, next) => {
        const { user } = req;
        const { daiictId, cartId } = user;
        const { collectionType } = req.params;

        const timeStamp = new Date();

        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);
        const readOwnPickupPermission = accessControl.can(user.userType)
            .readOwn(resources.collector);
        const updateOwnCartPermission = accessControl.can(user.userType)
            .updateOwn(resources.cart);
        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        if (updateOwnCartPermission.granted && user.userType === userTypes.student) {
            const pickup = new Collector(req.value.body);
            pickup.createdOn = timeStamp;
            pickup.createdBy = daiictId;

            const cart = await Cart.findById(cartId)
                .populate({
                    path: 'orders',
                    select: readOwnOrderPermission.attributes
                });

            if (!cart) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            } else if (cart.status === cartStatus.unplaced) {

                cart.orders = await validateOrder(cart.orders, user);

                const ordersCost = await calculateOrdersCost(cart);
                if (ordersCost === -1) {
                    cart.status = cartStatus.invalid;
                    cart.validityErrors.push(errorMessages.invalid);
                } else {
                    cart.ordersCost = ordersCost;
                }

                const cost = await calculateCollectionTypeCost(collectionType, cart.orders, collectionTypes.pickup);
                if (cost === -1) {
                    res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCollectionType);
                    return;
                }

                cart.collectionTypeCost = cost;
                cart.totalCost = cart.collectionTypeCost + cart.ordersCost;

                cart.delivery = undefined;

                cart.collectionType = collectionType;
                cart.collectionTypeCategory = collectionTypes.pickup;
                cart.pickup = pickup._id;
                pickup.cartId = cart._id;

                const newPickup = await pickup.save();
                const newCart = await cart.save();

                const filteredPickup = filterResourceData(newPickup, readOwnPickupPermission.attributes);
                const filteredCart = filterResourceData(newCart, readOwnCartPermission.attributes);
                res.status(httpStatusCodes.CREATED)
                    .json({
                        cart: filteredCart,
                        pickup: filteredPickup
                    });
            } else {
                return res.sendStatus(httpStatusCodes.FORBIDDEN);
            }


        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    updatePickup: async (req, res, next) => {
        const { user } = req;
        const { daiictId, cartId } = user;
        const { collectionType } = req.params;

        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);
        const readOwnPickupPermission = accessControl.can(user.userType)
            .readOwn(resources.collector);
        const updateOwnCartPermission = accessControl.can(user.userType)
            .updateOwn(resources.cart);
        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        if (updateOwnCartPermission.granted && user.userType === userTypes.student) {
            const pickup = req.value.body;

            const cart = await Cart.findById(cartId)
                .populate({
                    path: 'orders',
                    select: readOwnOrderPermission.attributes
                });


            if (!cart || !cart.pickup) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            } else if (cart.status === cartStatus.unplaced) {

                cart.orders = await validateOrder(cart.orders, user);

                const ordersCost = await calculateOrdersCost(cart);
                if (ordersCost === -1) {
                    cart.status = cartStatus.invalid;
                    cart.validityErrors.push(errorMessages.invalid);
                } else {
                    cart.ordersCost = ordersCost;
                }


                const cost = await calculateCollectionTypeCost(collectionType, cart.orders, collectionTypes.pickup);
                if (cost === -1) {
                    res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCollectionType);
                    return;
                }

                cart.collectionType = collectionType;
                cart.collectionTypeCost = cost;
                cart.totalCost = cart.collectionTypeCost + cart.ordersCost;

                const newPickup = await Collector.findByIdAndUpdate(cart.pickup, pickup, { new: true });
                const newCart = await cart.save();

                const filteredPickup = filterResourceData(newPickup, readOwnPickupPermission.attributes);
                const filteredCart = filterResourceData(newCart, readOwnCartPermission.attributes);
                res.status(httpStatusCodes.OK)
                    .json({
                        cart: filteredCart,
                        pickup: filteredPickup
                    });

            } else {
                return res.sendStatus(httpStatusCodes.FORBIDDEN);
            }
        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    addOfflinePayment: async (req, res, next) => {
        const { user } = req;
        const { daiictId, cartId } = user;

        const updateOwnCartPermission = accessControl.can(user.userType)
            .updateOwn(resources.cart);
        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);
        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        if (updateOwnCartPermission.granted && user.userType === userTypes.student) {

            const cartInDb = await Cart.findById(cartId)
                .populate({
                    path: 'orders',
                    select: readOwnOrderPermission.attributes
                });

            if (cartInDb) {
                if (cartInDb.status === cartStatus.unplaced) {
                    const cartUpdateAtt = req.value.body;
                    cartUpdateAtt.status = cartStatus.placed;
                    cartUpdateAtt.paymentCode = paymentCodeGenerator.generate();
                    cartUpdateAtt['$set'] = {
                        'statusChangeTime.placed': {
                            time: new Date(),
                            by: systemAdmin
                        }
                    };

                    cartUpdateAtt.lastModifiedBy = daiictId;
                    cartUpdateAtt.lastModified = new Date();

                    cartInDb.orders = await validateOrder(cartInDb.orders, user);

                    const ordersCost = await calculateOrdersCost(cartInDb);
                    if (ordersCost === -1) {
                        cartInDb.status = cartStatus.invalid;
                        cartInDb.validityErrors.push(errorMessages.invalid);
                    } else {
                        cartInDb.ordersCost = ordersCost;
                    }

                    const collectionTypeCost = await calculateCollectionTypeCost(cartInDb.collectionType, cartInDb.orders);
                    if (collectionTypeCost === -1) {
                        res.status(httpStatusCodes.PRECONDITION_FAILED)
                            .send(errorMessages.invalidCollectionType);
                        return;
                    }
                    cartInDb.collectionTypeCost = collectionTypeCost;
                    cartInDb.totalCost = cartInDb.collectionTypeCost + cartInDb.ordersCost;

                    if (cartInDb.orders.length === 0) {
                        return res.status(httpStatusCodes.BAD_REQUEST)
                            .send(errorMessages.noOrdersInCart);
                    }
                    if (ordersCost === -1) {
                        cartInDb.status = cartStatus.invalid;
                        return res.status(httpStatusCodes.PRECONDITION_FAILED)
                            .send(errorMessages.invalid);
                    }

                    if (cartInDb.delivery === undefined && cartInDb.pickup === undefined) {
                        return res.status(httpStatusCodes.PRECONDITION_FAILED)
                            .send(errorMessages.noCollectionType);
                    }

                    if (!(await checkPaymentMode(cartInDb, cartUpdateAtt.paymentType))) {
                        return res.status(httpStatusCodes.PRECONDITION_FAILED)
                            .send(errorMessages.invalidPaymentType);
                    }

                    /* save final cart and orders*/
                    for (let i = 0; i < cartInDb.orders.length; i++) {
                        await cartInDb.orders[i].save();
                    }

                    await cartInDb.save();

                    const placedCartDoc = filterResourceData(cartInDb, placedCartAttributes);
                    placedCartDoc.cartId = cartInDb._id;

                    for (let i = 0; i < cartInDb.orders.length; i++) {
                        const order = await Order.findByIdAndUpdate(cartInDb.orders[i], {
                            status: orderStatus.placed,
                            '$set': {
                                'statusChangeTime.placed': {
                                    time: new Date(),
                                    by: systemAdmin
                                },
                            }
                        }, { new: true })
                            .populate('service');
                        const placedOrderDoc = filterResourceData(order, placedOrderAttributes);
                        placedOrderDoc.service = filterResourceData(placedOrderDoc.service, placedOrderServiceAttributes);
                        placedOrderDoc.orderId = order._id;

                        const placedOrder = new PlacedOrder(placedOrderDoc);
                        await placedOrder.save();
                        placedCartDoc.orders[i] = placedOrder._id;
                    }

                    placedCartDoc.status = cartUpdateAtt.status;
                    const placedCart = new PlacedCart(placedCartDoc);
                    await placedCart.save();

                    const notification = generateCartStatusChangeNotification(daiictId, systemAdmin, cartInDb.orders.length, cartUpdateAtt.status);
                    await notification.save();

                    const updatedCart = await Cart.findByIdAndUpdate(cartId, cartUpdateAtt, { new: true });

                    const cart = new Cart({
                        requestedBy: daiictId,
                        createdOn: user.createdOn,
                    });
                    await cart.save();
                    user.cartId = cart._id;
                    await user.save();

                    let mailTo = (await UserInfo.findOne({ user_inst_id: updatedCart.requestedBy })).user_email_id;
                    let cc = mailTemplates['orderPlaced'].cc;
                    let bcc = mailTemplates['orderPlaced'].bcc;
                    let mailSubject = mailTemplates['orderPlaced'].subject;
                    let options = {
                        orderId: updatedCart.orderId,
                        cartLength: updatedCart.orders.length,
                        totalCost: updatedCart.totalCost,
                        paymentCode: updatedCart.paymentCode
                    };
                    let mailBody = mustache.render(mailTemplates['orderPlaced'].body, options);
                    await sendMail(mailTo, cc, bcc, mailSubject, mailBody);

                    const filteredCart = filterResourceData(updatedCart, readOwnCartPermission.attributes);

                    res.status(httpStatusCodes.OK)
                        .json({ cart: filteredCart });
                } else if (cartInDb.status === cartStatus.processingPayment) {
                    res.status(httpStatusCodes.BAD_REQUEST)
                        .send(errorMessages.paymentInProcessing);
                }
                else {
                    res.sendStatus(httpStatusCodes.BAD_REQUEST);
                }
            } else {
                res.sendStatus(httpStatusCodes.NOT_FOUND);
            }
        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    retryOfflinePayment: async (req, res, next) => {
        const { user } = req;
        const { cartId } = req.params;
        const { daiictId } = user;

        const updateOwnCartPermission = accessControl.can(user.userType)
            .updateOwn(resources.cart);
        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);
        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        if (updateOwnCartPermission.granted && user.userType === userTypes.student) {

            const cartInDb = await Cart.findById(cartId)
                .populate({
                    path: 'orders',
                    select: readOwnOrderPermission.attributes
                });

            if (cartInDb) {
                if (cartInDb.status === cartStatus.paymentFailed) {
                    const cartUpdateAtt = req.value.body;
                    cartUpdateAtt.status = cartStatus.placed;
                    cartUpdateAtt.paymentCode = paymentCodeGenerator.generate();
                    cartUpdateAtt['$set'] = {
                        'statusChangeTime.placed': {
                            time: new Date(),
                            by: systemAdmin
                        }
                    };

                    cartUpdateAtt.lastModifiedBy = daiictId;
                    cartUpdateAtt.lastModified = new Date();

                    cartInDb.orders = await validateOrder(cartInDb.orders, user);

                    const ordersCost = await calculateOrdersCost(cartInDb);
                    if (ordersCost === -1) {
                        cartInDb.status = cartStatus.invalid;
                        cartInDb.validityErrors.push(errorMessages.invalid);
                    } else {
                        cartInDb.ordersCost = ordersCost;
                    }

                    const collectionTypeCost = await calculateCollectionTypeCost(cartInDb.collectionType, cartInDb.orders);
                    if (collectionTypeCost === -1) {
                        res.status(httpStatusCodes.PRECONDITION_FAILED)
                            .send(errorMessages.invalidCollectionType);
                        return;
                    }
                    cartInDb.collectionTypeCost = collectionTypeCost;
                    cartInDb.totalCost = cartInDb.collectionTypeCost + cartInDb.ordersCost;

                    if (cartInDb.orders.length === 0) {
                        return res.status(httpStatusCodes.BAD_REQUEST)
                            .send(errorMessages.noOrdersInCart);
                    }
                    if (ordersCost === -1) {
                        cartInDb.status = cartStatus.invalid;
                        return res.status(httpStatusCodes.PRECONDITION_FAILED)
                            .send(errorMessages.invalid);
                    }

                    if (cartInDb.delivery === undefined && cartInDb.pickup === undefined) {
                        return res.status(httpStatusCodes.PRECONDITION_FAILED)
                            .send(errorMessages.noCollectionType);
                    }

                    if (!(await checkPaymentMode(cartInDb, cartUpdateAtt.paymentType))) {
                        return res.status(httpStatusCodes.PRECONDITION_FAILED)
                            .send(errorMessages.invalidPaymentType);
                    }

                    /* save final cart and orders*/
                    for (let i = 0; i < cartInDb.orders.length; i++) {
                        await cartInDb.orders[i].save();
                    }

                    await cartInDb.save();

                    const placedCartDoc = filterResourceData(cartInDb, placedCartAttributes);
                    placedCartDoc.cartId = cartInDb._id;

                    for (let i = 0; i < cartInDb.orders.length; i++) {
                        const order = await Order.findByIdAndUpdate(cartInDb.orders[i], {
                            status: orderStatus.placed,
                            '$set': {
                                'statusChangeTime.placed': {
                                    time: new Date(),
                                    by: systemAdmin
                                },
                            }
                        }, { new: true })
                            .populate('service');
                        const placedOrderDoc = filterResourceData(order, placedOrderAttributes);
                        placedOrderDoc.service = filterResourceData(placedOrderDoc.service, placedOrderServiceAttributes);
                        placedOrderDoc.orderId = order._id;

                        const placedOrder = new PlacedOrder(placedOrderDoc);
                        await placedOrder.save();
                        placedCartDoc.orders[i] = placedOrder._id;
                    }

                    placedCartDoc.status = cartUpdateAtt.status;
                    const placedCart = new PlacedCart(placedCartDoc);
                    await placedCart.save();

                    const notification = generateCartStatusChangeNotification(daiictId, systemAdmin, cartInDb.orders.length, cartUpdateAtt.status);
                    await notification.save();

                    const updatedCart = await Cart.findByIdAndUpdate(cartId, cartUpdateAtt, { new: true });

                    const cart = new Cart({
                        requestedBy: daiictId,
                        createdOn: user.createdOn,
                    });
                    await cart.save();
                    user.cartId = cart._id;
                    await user.save();

                    let mailTo = (await UserInfo.findOne({ user_inst_id: updatedCart.requestedBy })).user_email_id;
                    let cc = mailTemplates['orderPlaced'].cc;
                    let bcc = mailTemplates['orderPlaced'].bcc;
                    let mailSubject = mailTemplates['orderPlaced'].subject;
                    let options = {
                        orderId: updatedCart.orderId,
                        cartLength: updatedCart.orders.length,
                        totalCost: updatedCart.totalCost,
                        paymentCode: updatedCart.paymentCode
                    };
                    let mailBody = mustache.render(mailTemplates['orderPlaced'].body, options);
                    await sendMail(mailTo, cc, bcc, mailSubject, mailBody);

                    const filteredCart = filterResourceData(updatedCart, readOwnCartPermission.attributes);

                    res.status(httpStatusCodes.OK)
                        .json({ cart: filteredCart });
                } else if (cartInDb.status === cartStatus.processingPayment) {
                    res.status(httpStatusCodes.BAD_REQUEST)
                        .send(errorMessages.paymentInProcessing);
                }
                else {
                    res.sendStatus(httpStatusCodes.BAD_REQUEST);
                }
            } else {
                res.sendStatus(httpStatusCodes.NOT_FOUND);
            }
        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    addEasyPayPayment: async (req, res, next) => {
        const { user } = req;
        const { daiictId, cartId } = user;

        const updateOwnCartPermission = accessControl.can(user.userType)
            .updateOwn(resources.cart);
        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);
        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        if (updateOwnCartPermission.granted && user.userType === userTypes.student) {

            const cartInDb = await Cart.findById(cartId)
                .populate({
                    path: 'orders',
                    select: readOwnOrderPermission.attributes
                });

            if (cartInDb) {
                if (cartInDb.status === cartStatus.unplaced) {
                    const cartUpdateAtt = req.value.body;
                    cartUpdateAtt.status = cartStatus.paymentFailed;
                    cartUpdateAtt.paymentCode = orderid.generate();
                    // cartUpdateAtt['$set'] = {
                    //     'statusChangeTime.processingPayment': {
                    //         time: new Date(),
                    //         by: systemAdmin
                    //     }
                    // };

                    cartUpdateAtt.lastModifiedBy = daiictId;
                    cartUpdateAtt.lastModified = new Date();

                    cartInDb.orders = await validateOrder(cartInDb.orders, user);

                    const ordersCost = await calculateOrdersCost(cartInDb);
                    if (ordersCost === -1) {
                        cartInDb.status = cartStatus.invalid;
                        cartInDb.validityErrors.push(errorMessages.invalid);
                    } else {
                        cartInDb.ordersCost = ordersCost;
                    }

                    const collectionTypeCost = await calculateCollectionTypeCost(cartInDb.collectionType, cartInDb.orders);
                    if (collectionTypeCost === -1) {
                        res.status(httpStatusCodes.PRECONDITION_FAILED)
                            .send(errorMessages.invalidCollectionType);
                        return;
                    }
                    cartInDb.collectionTypeCost = collectionTypeCost;
                    cartInDb.totalCost = cartInDb.collectionTypeCost + cartInDb.ordersCost;

                    if (cartInDb.orders.length === 0) {
                        return res.status(httpStatusCodes.BAD_REQUEST)
                            .send(errorMessages.noOrdersInCart);
                    }
                    if (ordersCost === -1) {
                        cartInDb.status = cartStatus.invalid;
                        return res.status(httpStatusCodes.PRECONDITION_FAILED)
                            .send(errorMessages.invalid);
                    }

                    if (cartInDb.delivery === undefined && cartInDb.pickup === undefined) {
                        return res.status(httpStatusCodes.PRECONDITION_FAILED)
                            .send(errorMessages.noCollectionType);
                    }

                    if (!(await checkPaymentMode(cartInDb, cartUpdateAtt.paymentType))) {
                        return res.status(httpStatusCodes.PRECONDITION_FAILED)
                            .send(errorMessages.invalidPaymentType);
                    }

                    /* save final cart and orders*/
                    for (let i = 0; i < cartInDb.orders.length; i++) {
                        await cartInDb.orders[i].save();
                    }

                    await cartInDb.save();

                    const notification = generateCartStatusChangeNotification(daiictId, systemAdmin, cartInDb.orders.length, cartUpdateAtt.status);
                    await notification.save();

                    const updatedCart = await Cart.findByIdAndUpdate(cartId, cartUpdateAtt, { new: true });

                    const filteredCart = filterResourceData(updatedCart, readOwnCartPermission.attributes);

                    const cart = new Cart({
                        requestedBy: daiictId,
                        createdOn: user.createdOn,
                    });
                    await cart.save();
                    user.cartId = cart._id;
                    await user.save();

                    res.status(httpStatusCodes.OK)
                        .json({
                            cart: filteredCart,
                            url: getEasyPayUrl(updatedCart)
                        });
                } else if (cartInDb.status === cartStatus.processingPayment) {
                    res.status(httpStatusCodes.BAD_REQUEST)
                        .send(errorMessages.paymentInProcessing);
                }
                else {
                    res.sendStatus(httpStatusCodes.BAD_REQUEST);
                }
            } else {
                res.sendStatus(httpStatusCodes.NOT_FOUND);
            }
        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    retryEasyPayPayment: async (req, res, next) => {
        const { user } = req;
        const { cartId } = req.params;
        const { daiictId } = user;

        const updateOwnCartPermission = accessControl.can(user.userType)
            .updateOwn(resources.cart);
        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);
        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        if (updateOwnCartPermission.granted && user.userType === userTypes.student) {

            const cartInDb = await Cart.findById(cartId)
                .populate({
                    path: 'orders',
                    select: readOwnOrderPermission.attributes
                });

            if (cartInDb) {
                if (cartInDb.status === cartStatus.paymentFailed) {
                    const cartUpdateAtt = req.value.body;
                    cartUpdateAtt.status = cartStatus.paymentFailed;
                    cartUpdateAtt.paymentCode = orderid.generate();
                    cartUpdateAtt['$set'] = {
                        'statusChangeTime.paymentFailed': {
                            time: new Date(),
                            by: systemAdmin
                        }
                    };

                    cartUpdateAtt.lastModifiedBy = daiictId;
                    cartUpdateAtt.lastModified = new Date();

                    cartInDb.orders = await validateOrder(cartInDb.orders, user);

                    const ordersCost = await calculateOrdersCost(cartInDb);
                    if (ordersCost === -1) {
                        cartInDb.status = cartStatus.invalid;
                        cartInDb.validityErrors.push(errorMessages.invalid);
                    } else {
                        cartInDb.ordersCost = ordersCost;
                    }

                    const collectionTypeCost = await calculateCollectionTypeCost(cartInDb.collectionType, cartInDb.orders);
                    if (collectionTypeCost === -1) {
                        res.status(httpStatusCodes.PRECONDITION_FAILED)
                            .send(errorMessages.invalidCollectionType);
                        return;
                    }
                    cartInDb.collectionTypeCost = collectionTypeCost;
                    cartInDb.totalCost = cartInDb.collectionTypeCost + cartInDb.ordersCost;

                    if (cartInDb.orders.length === 0) {
                        return res.status(httpStatusCodes.BAD_REQUEST)
                            .send(errorMessages.noOrdersInCart);
                    }
                    if (ordersCost === -1) {
                        cartInDb.status = cartStatus.invalid;
                        return res.status(httpStatusCodes.PRECONDITION_FAILED)
                            .send(errorMessages.invalid);
                    }

                    if (cartInDb.delivery === undefined && cartInDb.pickup === undefined) {
                        return res.status(httpStatusCodes.PRECONDITION_FAILED)
                            .send(errorMessages.noCollectionType);
                    }

                    if (!(await checkPaymentMode(cartInDb, cartUpdateAtt.paymentType))) {
                        return res.status(httpStatusCodes.PRECONDITION_FAILED)
                            .send(errorMessages.invalidPaymentType);
                    }

                    /* save final cart and orders*/
                    for (let i = 0; i < cartInDb.orders.length; i++) {
                        await cartInDb.orders[i].save();
                    }

                    await cartInDb.save();

                    const notification = generateCartStatusChangeNotification(daiictId, systemAdmin, cartInDb.orders.length, cartUpdateAtt.status);
                    await notification.save();

                    const updatedCart = await Cart.findByIdAndUpdate(cartId, cartUpdateAtt, { new: true });

                    const filteredCart = filterResourceData(updatedCart, readOwnCartPermission.attributes);

                    const cart = new Cart({
                        requestedBy: daiictId,
                        createdOn: user.createdOn,
                    });
                    await cart.save();
                    user.cartId = cart._id;
                    await user.save();

                    res.status(httpStatusCodes.OK)
                        .json({
                            cart: filteredCart,
                            url: getEasyPayUrl(updatedCart)
                        });
                } else if (cartInDb.status === cartStatus.processingPayment) {
                    res.status(httpStatusCodes.BAD_REQUEST)
                        .send(errorMessages.paymentInProcessing);
                }
                else {
                    res.sendStatus(httpStatusCodes.BAD_REQUEST);
                }
            } else {
                res.sendStatus(httpStatusCodes.NOT_FOUND);
            }
        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    acceptEasyPayPayment: async (req, res, next) => {
        const responseCode = req.body['Response Code'];
        const uniqueRefNo = req.body['Unique Ref Number'];
        const serviceTaxAmount = req.body['Service Tax Amount'];
        const processingFeeAmount = req.body['Processing Fee Amount'];
        const totalAmount = req.body['Total Amount'];
        const transactionAmount = req.body['Transaction Amount'];
        const transactionDate = req.body['Transaction Date'];
        const interchangeValue = req.body['Interchange Value'];
        const tdr = req.body['TDR'];
        const paymentMode = req.body['Payment Mode'];
        const subMerchantId = req.body['SubMerchantId'];
        const referenceNo = req.body['ReferenceNo'];
        const tps = req.body['TPS'];
        const id = req.body['ID'];
        const rs = req.body['RS'];

        const paymentInfo = new EasyPayPaymentInfo({
            responseCode,
            uniqueRefNo,
            serviceTaxAmount,
            processingFeeAmount,
            totalAmount,
            transactionAmount,
            transactionDate,
            interchangeValue,
            tdr,
            paymentMode,
            subMerchantId,
            referenceNo,
            tps,
            id,
            rs
        });

        await paymentInfo.save();

        const signatureStr = `${id}|${responseCode}|${uniqueRefNo}|${serviceTaxAmount}|${processingFeeAmount}|${totalAmount}|${transactionAmount}|${transactionDate}|${interchangeValue}|${tdr}|${paymentMode}|${subMerchantId}|${referenceNo}|${tps}|${process.env.aeskey}`;
        const SHA512Sig = createSHASig(signatureStr);

        if (SHA512Sig === rs) {

            const cartInDb = await Cart.findOne({ paymentCode: referenceNo });

            if (cartInDb) {

                if (responseCode !== easyPaySuccessResponse) {
                    const cartUpdateAtt = {
                        status: cartStatus.paymentFailed,
                        '$set': {
                            'statusChangeTime.paymentFailed': {
                                time: new Date(),
                                by: systemAdmin
                            }
                        },
                        '$push': {
                            'paymentFailHistory': {
                                paymentId: uniqueRefNo,
                                paymentDate: transactionDate,
                                paymentType: 'EasyPay'
                            }
                        }
                    };
                    await Cart.findByIdAndUpdate(cartInDb._id, cartUpdateAtt, { new: true });

                    let mailTo = (await UserInfo.findOne({ user_inst_id: cartInDb.requestedBy })).user_email_id;
                    let cc = mailTemplates['failedEasyPayPayment'].cc;
                    let bcc = mailTemplates['failedEasyPayPayment'].bcc;
                    let mailSubject = mailTemplates['failedEasyPayPayment'].subject;
                    let options = {
                        orderId: cartInDb.orderId,
                        cartLength: cartInDb.orders.length,
                    };
                    let mailBody = mustache.render(mailTemplates['failedEasyPayPayment'].body, options);
                    await sendMail(mailTo, cc, bcc, mailSubject, mailBody);

                    const renderInfo = {};
                    renderInfo.orderId = cartInDb.orderId;
                    renderInfo.homePage = homePage;
                    renderInfo.transactionId = uniqueRefNo;
                    renderInfo.date = new Date().toDateString();
                    renderInfo.amount = totalAmount;

                    return res.render('paymentFail', { order: renderInfo });
                }

                const fieldsValidity = transactionAmount === cartInDb.totalCost && subMerchantId === process.env.submerchantid && id === process.env.merchantid;
                if (cartInDb.status === cartStatus.paymentFailed && cartInDb.paymentType === paymentTypes.online && fieldsValidity) {

                    const cartUpdateAtt = {
                        paymentId: uniqueRefNo,
                        paymentStatus: true
                    };

                    cartUpdateAtt.status = cartStatus.processing;
                    cartUpdateAtt['$set'] = {
                        'statusChangeTime.placed': {
                            time: new Date(),
                            by: systemAdmin
                        },
                        'statusChangeTime.paymentComplete': {
                            time: new Date(),
                            by: systemAdmin
                        },
                        'statusChangeTime.processing': {
                            time: new Date(),
                            by: systemAdmin
                        }
                    };

                    if (cartInDb.collectionTypeCategory === collectionTypes.pickup) {
                        await Collector.findByIdAndUpdate(cartInDb.pickup, { status: collectionStatus.processing });
                    } else if (cartInDb.collectionTypeCategory === collectionTypes.delivery) {
                        await Delivery.findByIdAndUpdate(cartInDb.delivery, { status: collectionStatus.processing });
                    }

                    for (let i = 0; i < cartInDb.orders.length; i++) {
                        await Order.findByIdAndUpdate(cartInDb.orders[i], {
                            status: orderStatus.processing,
                            '$set': {
                                'statusChangeTime.processing': {
                                    time: new Date(),
                                    by: systemAdmin
                                },
                            }
                        });
                    }


                    const placedCartDoc = filterResourceData(cartInDb, placedCartAttributes);
                    placedCartDoc.cartId = cartInDb._id;

                    for (let i = 0; i < cartInDb.orders.length; i++) {
                        const order = await Order.findByIdAndUpdate(cartInDb.orders[i], {
                            status: orderStatus.processing,
                            '$set': {
                                'statusChangeTime.placed': {
                                    time: new Date(),
                                    by: systemAdmin
                                },
                                'statusChangeTime.processing': {
                                    time: new Date(),
                                    by: systemAdmin
                                },
                            }
                        }, { new: true })
                            .populate('service');

                        const placedOrderDoc = filterResourceData(order, placedOrderAttributes);
                        placedOrderDoc.service = filterResourceData(placedOrderDoc.service, placedOrderServiceAttributes);
                        placedOrderDoc.orderId = order._id;

                        const placedOrder = new PlacedOrder(placedOrderDoc);
                        await placedOrder.save();
                        placedCartDoc.orders[i] = placedOrder._id;
                    }

                    const updatedCart = await Cart.findOneAndUpdate({ paymentCode: referenceNo }, cartUpdateAtt, { new: true });

                    let mailTo = (await UserInfo.findOne({ user_inst_id: cartInDb.requestedBy })).user_email_id;
                    let cc = mailTemplates['successfulEasyPayPayment'].cc;
                    let bcc = mailTemplates['successfulEasyPayPayment'].bcc;
                    let mailSubject = mailTemplates['successfulEasyPayPayment'].subject;
                    let options = {
                        orderId: cartInDb.orderId,
                        cartLength: cartInDb.orders.length,
                        paymentId: cartInDb.paymentId
                    };
                    let mailBody = mustache.render(mailTemplates['successfulEasyPayPayment'].body, options);
                    await sendMail(mailTo, cc, bcc, mailSubject, mailBody);

                    const notification = generateCartStatusChangeNotification(cartInDb.requestedBy, systemAdmin, cartInDb.orders.length, cartUpdateAtt.status);
                    await notification.save();

                    const renderInfo = {};
                    renderInfo.orderId = cartInDb.orderId;
                    renderInfo.homePage = homePage;
                    renderInfo.transactionId = uniqueRefNo;
                    renderInfo.date = new Date().toDateString();
                    renderInfo.amount = totalAmount;

                    return res.render('paymentSuccess', { order: renderInfo });

                } else {
                    res.sendStatus(httpStatusCodes.BAD_REQUEST);
                }
            } else {
                res.sendStatus(httpStatusCodes.NOT_FOUND);
            }
        } else {
            res.sendStatus(httpStatusCodes.BAD_REQUEST);
        }
    },

    acceptPayment: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { paymentCode } = req.params;

        const changeStatusPermission = accessControl.can(user.userType)
            .updateAny(resources.changeOrderStatus);
        const readAnyCartPermission = accessControl.can(user.userType)
            .readAny(resources.cart);

        if (changeStatusPermission.granted) {

            const cartUpdateAtt = {
                paymentId: paymentCode
            };
            cartUpdateAtt.lastModifiedBy = daiictId;
            cartUpdateAtt.lastModified = new Date();
            cartUpdateAtt.status = cartStatus.paymentComplete;
            cartUpdateAtt.paymentStatus = true;

            cartUpdateAtt['$set'] = {
                'statusChangeTime.paymentComplete': {
                    time: new Date(),
                    by: daiictId
                },
                'statusChangeTime.processing': {
                    time: new Date(),
                    by: daiictId
                }
            };

            const cartInDb = await Cart.findOne({ paymentCode });

            if (cartInDb) {
                if (cartInDb.status === cartStatus.placed && cartInDb.paymentType === paymentTypes.offline) {

                    if (cartInDb.collectionTypeCategory === collectionTypes.pickup) {
                        await Collector.findByIdAndUpdate(cartInDb.pickup, { status: collectionStatus.processing });
                    } else if (cartInDb.collectionTypeCategory === collectionTypes.delivery) {
                        await Delivery.findByIdAndUpdate(cartInDb.delivery, { status: collectionStatus.processing });
                    }

                    for (let i = 0; i < cartInDb.orders.length; i++) {
                        await Order.findByIdAndUpdate(cartInDb.orders[i], {
                            status: orderStatus.processing,
                            '$set': {
                                'statusChangeTime.processing': {
                                    time: new Date(),
                                    by: systemAdmin
                                },
                            }
                        });
                    }

                    cartUpdateAtt.status = cartStatus.processing;

                    const updatedCart = await Cart.findOneAndUpdate({ paymentCode }, cartUpdateAtt, { new: true });

                    let mailTo = (await UserInfo.findOne({ user_inst_id: cartInDb.requestedBy })).user_email_id;
                    let cc = mailTemplates['offlinePaymentAccepted'].cc;
                    let bcc = mailTemplates['offlinePaymentAccepted'].bcc;
                    let mailSubject = mailTemplates['offlinePaymentAccepted'].subject;
                    let options = {
                        orderId: cartInDb.orderId,
                        cartLength: cartInDb.orders.length,
                    };
                    let mailBody = mustache.render(mailTemplates['offlinePaymentAccepted'].body, options);
                    await sendMail(mailTo, cc, bcc, mailSubject, mailBody);

                    const notification = generateCartStatusChangeNotification(cartInDb.requestedBy, daiictId, cartInDb.orders.length, cartUpdateAtt.status);
                    await notification.save();

                    const filteredCart = filterResourceData(updatedCart, readAnyCartPermission.attributes);

                    res.status(httpStatusCodes.OK)
                        .json({ cart: filteredCart });
                } else {
                    res.sendStatus(httpStatusCodes.BAD_REQUEST);
                }
            } else {
                res.sendStatus(httpStatusCodes.NOT_FOUND);
            }
        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    changeStatus: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { cartId } = req.params;

        const changeStatusPermission = accessControl.can(user.userType)
            .updateAny(resources.changeOrderStatus);
        const readAnyCartPermission = accessControl.can(user.userType)
            .readAny(resources.cart);
        const readAnyOrderPermission = accessControl.can(user.userType)
            .readAny(resources.order);

        if (changeStatusPermission.granted) {

            const cartUpdateAtt = req.value.body;

            const cartInDb = await Cart.findById(cartId)
                .populate({
                    path: 'orders',
                    select: readAnyOrderPermission.attributes
                });

            if (cartInDb) {
                if (cartInDb.status !== cartStatus.readyToDeliver && cartInDb.status !== cartStatus.readyToPickup) {
                    return res.status(httpStatusCodes.BAD_REQUEST)
                        .send(errorMessages.invalidStatusChange);
                }

                let updateAtt = {
                    lastModifiedBy: daiictId,
                    lastModified: new Date()
                };

                let mailTo = await UserInfo.findOne({ user_inst_id: cartInDb.requestedBy }).user_email_id;
                let cc = mailTemplates['orderCompleted-Delivery'].cc;
                let bcc = mailTemplates['orderCompleted-Delivery'].bcc;
                let mailSubject = mailTemplates['orderCompleted-Delivery'].subject;
                let mailBody;

                switch (cartUpdateAtt.status) {
                    case cartStatus.completed:
                        updateAtt.status = cartStatus.completed;
                        updateAtt['$set'] = {
                            'statusChangeTime.completed': {
                                time: new Date(),
                                by: daiictId
                            }
                        };

                        if (cartUpdateAtt.comment) {
                            updateAtt['$set'] = {
                                'comment.completed': cartUpdateAtt.comment
                            };
                        }

                        if (cartInDb.collectionTypeCategory === collectionTypes.delivery) {
                            if (cartUpdateAtt.courierServiceName === undefined || cartUpdateAtt.trackingId === undefined) {
                                return res.status(httpStatusCodes.PRECONDITION_FAILED)
                                    .send(errorMessages.courierInformationRequired);
                            }

                            await Delivery.findByIdAndUpdate(cartInDb.delivery, { status: collectionStatus.completed });

                            const updatedDelivery = await Delivery.findByIdAndUpdate(cartInDb.delivery, {
                                courierServiceName: cartUpdateAtt.courierServiceName,
                                trackingId: cartUpdateAtt.trackingId
                            });

                            const options = {
                                orderId: cartInDb.orderId,
                                cartLength: cartInDb.orders.length,
                                courierServiceName: updatedDelivery.courierServiceName,
                                trackingId: updatedDelivery.trackingId
                            };
                            mailBody = mustache.render(mailTemplates['orderCompleted-Delivery'].body, options);

                            if (!updatedDelivery) {
                                return res.sendStatus(httpStatusCodes.NOT_FOUND);
                            }


                        } else {
                            const options = {
                                orderId: cartInDb.orderId,
                                cartLength: cartInDb.orders.length,
                            };
                            mailBody = mustache.render(mailTemplates['orderCompleted-Pickup'].body, options);

                            await Collector.findByIdAndUpdate(cartInDb.pickup, { status: collectionStatus.completed });
                        }
                        for (let i = 0; i < cartInDb.orders.length; i++) {
                            if (cartInDb.orders[i].status !== orderStatus.cancelled) {
                                await Order.findByIdAndUpdate(cartInDb.orders[i], {
                                    status: orderStatus.completed,
                                    '$set': {
                                        'statusChangeTime.completed': {
                                            time: new Date(),
                                            by: systemAdmin
                                        },
                                    }
                                });
                                await PlacedOrder.findOneAndUpdate({ orderId: cartInDb.orders[i] }, { status: orderStatus.completed });
                            }

                        }
                        break;
                    default :
                        return res.sendStatus(httpStatusCodes.BAD_REQUEST);
                }

                await PlacedCart.findOneAndUpdate({ cartId }, { status: cartStatus.completed });
                const updatedCart = await Cart.findByIdAndUpdate(cartId, updateAtt, { new: true });

                await sendMail(mailTo, cc, bcc, mailSubject, mailBody);

                if (updatedCart) {

                    // Generating notification
                    const notification = generateCartStatusChangeNotification(updatedCart.requestedBy, daiictId, updatedCart.orders.length, updatedCart.status);
                    await notification.save();

                    // Generating invoice
                    generateInvoice(cartId);

                    const filteredCart = filterResourceData(updatedCart, readAnyCartPermission.attributes);
                    res.status(httpStatusCodes.OK)
                        .json({ cart: filteredCart });
                } else {
                    res.sendStatus(httpStatusCodes.NOT_FOUND);
                }
            } else {
                res.sendStatus(httpStatusCodes.NOT_FOUND);
            }
        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    cancelCart: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { cartId } = req.params;

        const changeStatusPermission = accessControl.can(user.userType)
            .updateAny(resources.changeOrderStatus);

        if (changeStatusPermission.granted) {

            const cartUpdateAtt = req.value.body;
            cartUpdateAtt.lastModified = new Date();
            cartUpdateAtt.lastModifiedBy = daiictId;
            cartUpdateAtt.status = cartStatus.cancelled;
            cartUpdateAtt['$set'] = {
                'statusChangeTime.cancelled': {
                    time: new Date(),
                    by: daiictId
                }
            };

            const cartInDb = await Cart.findById(cartId);

            if (cartInDb) {
                if (cartInDb.status >= cartStatus.placed && cartInDb.status < cartStatus.completed) {

                    if (cartInDb.collectionTypeCategory === collectionTypes.delivery) {
                        await Delivery.findByIdAndUpdate(cartInDb.delivery, { status: collectionStatus.cancel });
                    } else if (cartInDb.collectionTypeCategory === collectionTypes.pickup) {
                        await Collector.findByIdAndUpdate(cartInDb.pickup, { status: collectionStatus.cancel });
                    }

                    for (let i = 0; i < cartInDb.orders.length; i++) {
                        await Order.findByIdAndUpdate(cartInDb.orders[i], {
                            status: orderStatus.cancelled,
                            lastModified: cartUpdateAtt.lastModified,
                            lastModifiedBy: daiictId,
                            cancelReason: cartUpdateAtt.cancelReason,
                            '$set': {
                                'statusChangeTime.cancelled': {
                                    time: new Date(),
                                    by: daiictId
                                }
                            }
                        });

                        await PlacedOrder.findOneAndUpdate({ orderId: cartInDb.orders[i] }, {
                            status: orderStatus.cancelled,
                            cancelReason: cartUpdateAtt.cancelReason
                        });
                    }

                    await Cart.findByIdAndUpdate(cartId, cartUpdateAtt);
                    await PlacedCart.findOneAndUpdate({ cartId }, {
                        status: cartStatus.cancelled,
                        cancelReason: cartUpdateAtt.cancelReason
                    });

                    let mailTo = (await UserInfo.findOne({ user_inst_id: cartInDb.requestedBy })).user_email_id;
                    let cc = mailTemplates['cancelCart'].cc;
                    let bcc = mailTemplates['cancelCart'].bcc;
                    let mailSubject = mailTemplates['cancelCart'].subject;
                    const options = {
                        orderId: cartInDb.orderId,
                        cancelReason: cartInDb.cancelReason
                    };
                    let mailBody = mustache.render(mailTemplates['cancelCart'].body, options);
                    await sendMail(mailTo, cc, bcc, mailSubject, mailBody);

                    const notification = generateCartStatusChangeNotification(cartInDb.requestedBy, daiictId, cartInDb.orders.length, cartStatus.cancelled, cartInDb.cancelReason);
                    await notification.save();

                    res.status(httpStatusCodes.OK)
                        .json({});
                } else {
                    res.sendStatus(httpStatusCodes.BAD_REQUEST);
                }

            } else {
                res.sendStatus(httpStatusCodes.NOT_FOUND);
            }
        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    addComment: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { cartId } = req.params;

        const readAnyCartPermission = accessControl.can(user.userType)
            .readAny(resources.cart);

        if (readAnyCartPermission.granted) {

            const cartInDb = await Cart.findById(cartId);

            if (cartInDb.status >= cartStatus.processing) {
                const { comment } = req.body;
                switch (cartInDb.status) {
                    case cartStatus.processing:
                        cartInDb.comment.processing = comment;
                        break;
                    case cartStatus.readyToDeliver:
                        cartInDb.comment.readyToDeliver = comment;
                        break;
                    case cartStatus.readyToPickup:
                        cartInDb.comment.readyToPickup = comment;
                        break;
                    case cartStatus.completed:
                        cartInDb.comment.completed = comment;
                        break;
                    case cartStatus.onHold:
                        cartInDb.comment.onHold = comment;
                        break;
                    case cartStatus.cancelled:
                        cartInDb.comment.cancelled = comment;
                        cartInDb.cancelReason = comment;
                        break;
                    case cartStatus.refunded:
                        cartInDb.comment.refunded = comment;
                        break;
                    default:
                        res.sendStatus(httpStatusCodes.BAD_REQUEST);
                }

                await cartInDb.save();
                res.status(httpStatusCodes.OK)
                    .json({});
            } else {
                res.sendStatus(httpStatusCodes.BAD_REQUEST);
            }

        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    getInvoice: async (req, res, next) => {

        const { user } = req;
        const { cartId } = req.params;

        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);

        if (readOwnCartPermission.granted) {
            const cart = await Cart.findById(cartId);
            // const invoiceFile = './data/invoice_pdf/' + cart.orderId + '.pdf';
            // res.attachment(invoiceFile);          // sends 200 OK alongwith invoiceFile
            // res.sendStatus(httpStatusCodes.OK);

            let options = {
                root: './data/invoice_pdf/',
                dotfiles: 'deny',
                headers: {
                    'x-timestamp': Date.now(),
                    'x-sent': true,
                    'Content-type': 'application/pdf'
                }
            };

            let fileName = cart.orderId + '.pdf';
            res.sendFile(fileName, options, function (err) {
                if (err) {
                    console.log(err);
                    logger.error(err);
                    res.sendStatus(httpStatusCodes.NOT_FOUND);
                } else {
                    console.log('Sent: ', fileName);
                }
            });

        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    }
};
