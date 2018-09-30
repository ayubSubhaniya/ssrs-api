const { orderStatus } = require('../configuration/index');
const Notification = require('../models/notification');

const generateOrderStatusChangeNotification = (userId, adminId, orderName, orderStatusNum) => {
    var orderStatusMsg = 'Your order ' + orderName + ' ';
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

module.exports = {
    generateOrderStatusChangeNotification,
};