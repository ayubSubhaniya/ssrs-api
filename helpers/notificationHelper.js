const { orderStatus, cartStatus, systemAdmin } = require('../configuration/index');
const { StringFormatter } = require('../helpers/commonHelpers')
const Notification = require('../models/notification');
const StringConstants = require('../constants/strings')

const generateOrderStatusChangeNotification = (userId, adminId, orderName, orderStatusNum, cartId) => {
    let orderStatusMsg = '';
    switch (orderStatusNum) {
        case orderStatus.unplaced:
            orderStatusMsg = StringFormatter(StringConstants.ORDER_STATUS_UNPLACED, [orderName]);
            break;
        case orderStatus.placed:
            orderStatusMsg = StringFormatter(StringConstants.ORDER_STATUS_PLACED, [orderName]);
            break;
        case orderStatus.processing:
            orderStatusMsg = StringFormatter(StringConstants.ORDER_STATUS_PROCESSING, [orderName]);
            break;
        case orderStatus.ready:
            orderStatusMsg = StringFormatter(StringConstants.ORDER_STATUS_READY, [orderName]);
            break;
        case orderStatus.completed:
            orderStatusMsg = StringFormatter(StringConstants.ORDER_STATUS_COMPLETED, [orderName]);
            break;

        case orderStatus.invalidOrder:
            orderStatusMsg = StringFormatter(StringConstants.ORDER_STATUS_INVALID_ORDER, [orderName]);
            break;
        case orderStatus.cancelled:
            orderStatusMsg = StringFormatter(StringConstants.ORDER_STATUS_CANCELLED, [orderName]);
            break;
        case orderStatus.paymentFailed:
            orderStatusMsg = StringFormatter(StringConstants.ORDER_STATUS_PAYMENT_FAILED, [orderName]);
            break;
        case orderStatus.onHold:
            orderStatusMsg = StringFormatter(StringConstants.ORDER_STATUS_ON_HOLD, [orderName]);
            break;
        case orderStatus.refunded:
            orderStatusMsg = StringFormatter(StringConstants.ORDER_STATUS_REFUNDED, [orderName]);
            break;
    }

    const notification = new Notification({
        createdBy: adminId,
        createdOn: new Date(),
        message: orderStatusMsg,
        userId: userId,
        cartId: cartId
    });

    return notification;
};

const generateCartStatusChangeNotification = (userId, adminId, cartLength, cartStatusNum, cancelReason, cartId) => {
    let cartStatusMsg = '';
    switch (cartStatusNum) {
        case cartStatus.unplaced:
            cartStatusMsg = StringFormatter(StringConstants.CART_STATUS_UNPLACED, [cartLength]);
            break;
        case cartStatus.placed:
            cartStatusMsg = StringFormatter(StringConstants.CART_STATUS_PLACED, [cartLength]);
            break;
        case cartStatus.processing:
            if (adminId !== systemAdmin) {
                cartStatusMsg = StringFormatter(StringConstants.CART_STATUS_PROCESSING_OFFLINE, [cartLength, adminId]);
            } else {
                cartStatusMsg = StringFormatter(StringConstants.CART_STATUS_PROCESSING_ONLINE, [cartLength]);
            }
            break;
        case cartStatus.readyToDeliver:
            cartStatusMsg = StringFormatter(StringConstants.CART_STATUS_READY_TO_DELIVER, [cartLength]);
            break;
        case cartStatus.readyToPickup:
            cartStatusMsg = StringFormatter(StringConstants.CART_STATUS_READY_TO_PICKUP, [cartLength]);
            break;
        case cartStatus.completed:
            cartStatusMsg = StringFormatter(StringConstants.CART_STATUS_COMPLETED, [cartLength]);
            break;

        case cartStatus.invalid:
            cartStatusMsg = StringFormatter(StringConstants.CART_STATUS_INVALID, [cartLength]);
            break;
        case cartStatus.cancelled:
            cartStatusMsg = StringFormatter(StringConstants.CART_STATUS_CANCELLED, [cartLength, cancelReason]);
            break;
        case cartStatus.paymentFailed:
            cartStatusMsg = StringFormatter(StringConstants.CART_STATUS_PAYMENT_FAILED, [cartLength]);
            break;
        case cartStatus.onHold:
            cartStatusMsg = StringFormatter(StringConstants.CART_STATUS_ON_HOLD, [cartLength]);
            break;
        case cartStatus.refunded:
            cartStatusMsg = StringFormatter(StringConstants.CART_STATUS_REFUNDED, [cartLength]);
            break;
    }

    const notification = new Notification({
        createdBy: adminId,
        createdOn: new Date(),
        message: cartStatusMsg,
        userId: userId,
        cartId: cartId
    });

    return notification;
};

const generatePendingPaymentNotification = (userId, adminId, cartLength, paymentType, cartId) => {
    const notification = new Notification({
        createdBy: adminId,
        createdOn: new Date(),
        message: StringFormatter(StringConstants.PENDING_PAYMENT_REMINDER, [cartLength, paymentType]),
        userId: userId,
        cartId: cartId
    });

    return notification;
};

const generateCustomNotification = (userId, adminId, message, cartId=undefined) => {
    const notification = new Notification({
        createdBy: adminId,
        createdOn: new Date(),
        message: message,
        userId: userId,
        cartId: cartId
    });
    return notification;
};

const updateCartIdInNotification = async (oldCartId, newCartId) => {

    const notifications = await Notification.find({
        cartId: oldCartId,
    });
    for (let i = 0; i < notifications.length; i++) {
        await Notification.findByIdAndUpdate(notifications[i]._id, {
            cartId: newCartId
        });
    }
};

module.exports = {
    generateOrderStatusChangeNotification,
    generateCartStatusChangeNotification,
    generatePendingPaymentNotification,
    generateCustomNotification,
    updateCartIdInNotification
};
