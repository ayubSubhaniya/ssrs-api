const { orderStatus, cartStatus } = require('../configuration/index');
const Notification = require('../models/notification');

const generateOrderStatusChangeNotification = (userId, adminId, orderName, orderStatusNum) => {
    let orderStatusMsg = 'Your order ' + orderName + ' ';
    switch (orderStatusNum) {
        case orderStatus.unplaced:
            orderStatusMsg += 'is still unplaced';
            break;
        case orderStatus.placed:
            orderStatusMsg += 'has been placed';
            break;
        case orderStatus.processing:
            orderStatusMsg += 'is in process';
            break;
        case orderStatus.ready:
            orderStatusMsg += 'is now ready';
            break;
        case orderStatus.completed:
            orderStatusMsg += 'has been completed';
            break;

        case orderStatus.invalidOrder:
            orderStatusMsg += 'is invalid';
            break;
        case orderStatus.cancelled:
            orderStatusMsg += 'was cancelled';
            break;
        case orderStatus.failed:
            orderStatusMsg += 'has failed';
            break;
        case orderStatus.onHold:
            orderStatusMsg += 'is on hold';
            break;
        case orderStatus.refunded:
            orderStatusMsg += 'has been refunded';
            break;
    }

    const notification = new Notification({
        createdBy: adminId,
        createdOn: new Date(),
        message: orderStatusMsg,
        userId: userId
    });

    return notification;
};

const generateCartStatusChangeNotification = (userId, adminId, cartLength, cartStatusNum) => {
    let cartStatusMsg = 'Your cart with ' + cartLength + ' order(s) ';
    switch(cartStatusNum){
        case cartStatus.unplaced:
            cartStatusMsg += 'is still unplaced';
            break;
        case cartStatus.placed:
            cartStatusMsg += 'has been placed';
            break;
        case cartStatus.processing:
            cartStatusMsg += 'has completed payment and is in process';
            if(adminId !== 'System')
                cartStatusMsg += '. Payment accepted by ' + adminId;
            break;
        case cartStatus.readyToDeliver:
            cartStatusMsg += 'is now ready to deliver';
            break;
        case cartStatus.readyToPickup:
            cartStatusMsg += 'is now ready to pickup';
            break;
        case cartStatus.completed:
            cartStatusMsg += 'has been completed';
            break;

        case cartStatus.invalid:
            cartStatusMsg += 'is invalid';
            break;
        case cartStatus.cancelled:
            cartStatusMsg += 'was cancelled';
            break;
        case cartStatus.failed:
            cartStatusMsg += 'has failed';
            break;
        case cartStatus.onHold:
            cartStatusMsg += 'is on hold';
            break;
        case cartStatus.refunded:
            cartStatusMsg += 'has been refunded';
            break;
    }

    const notification = new Notification({
        createdBy: adminId,
        createdOn: new Date(),
        message: cartStatusMsg,
        userId: userId
    });

    return notification;
};

module.exports = {
    generateOrderStatusChangeNotification,
    generateCartStatusChangeNotification,
};
