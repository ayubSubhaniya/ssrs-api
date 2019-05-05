const Service = require('../models/service');
const CollectionType = require('../models/collectionType');

const { orderStatus } = require('../configuration');
const { convertToStringArray } = require('../helpers/controllerHelpers');

const calculateCollectionTypeCost = async (collectionType, orders, collectionTypeCategory, id = true) => {
    if (collectionType === undefined) {
        return -1;
    }

    let collectionTypeDoc = collectionType;
    if (id) {
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

const validateCart = async (cart) => {
    cart.orders = await validateOrder(cart.orders, user);

    const ordersCost = await calculateOrdersCost(cart);
    if (ordersCost === -1) {
        cart.status = cartStatus.invalid;
        cart.validityErrors.push(errorMessages.invalid);
    } else {
        cart.ordersCost = ordersCost;
    }

    const collectionTypeCost = await calculateCollectionTypeCost(cart.collectionType, cart.orders, cart.collectionTypeCategory, false);

    if (collectionTypeCost === -1) {
        cart.status = cartStatus.invalid;
        cart.validityErrors.push(errorMessages.invalidCollectionType);
    } else {
        cart.collectionTypeCost = collectionTypeCost;
    }

    cart.totalCost = cart.collectionTypeCost + cart.ordersCost;
};

module.exports = {
    calculateCollectionTypeCost,
    calculateOrdersCost,
    checkPaymentMode
};
