const nodeSchedule = require('node-cron');
const mustache = require('mustache');

const PlacedCart = require('../models/placedCart');
const Cart = require('../models/cart');
const UserInfo = require('../models/userInfo');
const { clearHtmlFiles } = require('./invoiceMaker')

const {
    generateCartStatusChangeNotification,
    generatePendingPaymentNotification
} = require('../helpers/notificationHelper');
const {
    PAYMENT_JOB_SCHEDULE_EXPRESSION,
    systemAdmin,
    paymentTypes,
    cartStatus,
    ORDER_CANCEL_TIME_IN_PAYMENT_DELAY,
} = require('../configuration');
const { sendMail } = require('../configuration/mail'),
    mailTemplates = require('../configuration/mailTemplates.json');

const checkForOfflinePayment = async () => {

    const failedOrderTime = new Date();
    failedOrderTime.setDate(failedOrderTime.getDate() - ORDER_CANCEL_TIME_IN_PAYMENT_DELAY);

    const carts = await PlacedCart.find({
        status: cartStatus.placed,
    });

    for (let i = 0; i < carts.length; i++) {
        if (carts[i].statusChangeTime.placed.time <= failedOrderTime) {
            const updatedCart = await PlacedCart.findByIdAndUpdate(carts[i]._id, {
                status: cartStatus.cancelled,
                cancelReason: 'Payment delay',
                '$set': {
                    'statusChangeTime.cancelled': {
                        time: new Date(),
                        by: systemAdmin
                    }
                }
            }, { new: true });
            let mailTo = (await UserInfo.findOne({ user_inst_id: updatedCart.requestedBy })).user_email_id;
            let cc = mailTemplates['orderCancel-PaymentDelay'].cc;
            let bcc = mailTemplates['orderCancel-PaymentDelay'].bcc;
            let mailSubject = mailTemplates['orderCancel-PaymentDelay'].subject;
            let options = {
                orderId: updatedCart.orderId,
                cartLength: updatedCart.orders.length
            };
            let mailBody = mustache.render(mailTemplates['orderCancel-PaymentDelay'].body, options);
            await sendMail(mailTo, cc, bcc, mailSubject, mailBody);

            /*Generate notification for cancel*/
            const notification = generateCartStatusChangeNotification(updatedCart.requestedBy, systemAdmin, updatedCart.orders.length, cartStatus.cancelled, updatedCart.cancelReason, updatedCart.id);
            await notification.save();

        } else {
            const cancelledInDays = carts[i].statusChangeTime.placed.time.getDate() + ORDER_CANCEL_TIME_IN_PAYMENT_DELAY - new Date().getDate();

            let mailTo = (await UserInfo.findOne({ user_inst_id: carts[i].requestedBy })).user_email_id;
            let cc = mailTemplates['pendingPaymentOffline'].cc;
            let bcc = mailTemplates['pendingPaymentOffline'].bcc;
            let mailSubject = mailTemplates['pendingPaymentOffline'].subject;
            let options = {
                orderId: carts[i].orderId,
                cartLength: carts[i].orders.length,
                cancelledInDays,
                paymentCode: carts[i].paymentCode
            };
            let mailBody = mustache.render(mailTemplates['pendingPaymentOffline'].body, options);
            await sendMail(mailTo, cc, bcc, mailSubject, mailBody);

            /*Generate notification for payment*/
            const notification = generatePendingPaymentNotification(carts[i].requestedBy, systemAdmin, carts[i].orders.length, paymentTypes.offline, carts[i].id);
            await notification.save();
        }
    }
};

const checkForFailedOnlinePayment = async () => {

    const failedOrderTime = new Date();
    failedOrderTime.setDate(failedOrderTime.getDate() - ORDER_CANCEL_TIME_IN_PAYMENT_DELAY);

    const carts = await Cart.find({
        status: cartStatus.paymentFailed,
    });

    for (let i = 0; i < carts.length; i++) {
        if (carts[i].statusChangeTime.paymentFailed.time <= failedOrderTime) {
            const updatedCart = await Cart.findByIdAndUpdate(carts[i]._id, {
                status: cartStatus.cancelled,
                cancelReason: 'Payment delay',
                '$set': {
                    'statusChangeTime.cancelled': {
                        time: new Date(),
                        by: systemAdmin
                    }
                }
            }, { new: true });

            let mailTo = (await UserInfo.findOne({ user_inst_id: updatedCart.requestedBy })).user_email_id;
            let cc = mailTemplates['orderCancel-PaymentDelay'].cc;
            let bcc = mailTemplates['orderCancel-PaymentDelay'].bcc;
            let mailSubject = mailTemplates['orderCancel-PaymentDelay'].subject;
            let options = {
                orderId: updatedCart.orderId,
                cartLength: updatedCart.orders.length
            };
            let mailBody = mustache.render(mailTemplates['orderCancel-PaymentDelay'].body, options);
            await sendMail(mailTo, cc, bcc, mailSubject, mailBody);

            /*Generate notification for cancel*/
            const notification = generateCartStatusChangeNotification(updatedCart.requestedBy, systemAdmin, updatedCart.orders.length, cartStatus.cancelled, updatedCart.cancelReason, updatedCart.id);
            await notification.save();
        } else {
            const cancelledInDays = carts[i].statusChangeTime.paymentFailed.time.getDate() + ORDER_CANCEL_TIME_IN_PAYMENT_DELAY - new Date().getDate();

            let mailTo = (await UserInfo.findOne({ user_inst_id: carts[i].requestedBy })).user_email_id;
            let cc = mailTemplates['pendingPaymentOnline'].cc;
            let bcc = mailTemplates['pendingPaymentOnline'].bcc;
            let mailSubject = mailTemplates['pendingPaymentOnline'].subject;
            let options = {
                orderId: carts[i].orderId,
                cartLength: carts[i].orders.length,
                cancelledInDays,
                paymentCode: carts[i].paymentCode
            };
            let mailBody = mustache.render(mailTemplates['pendingPaymentOnline'].body, options);
            await sendMail(mailTo, cc, bcc, mailSubject, mailBody);

            /*Generate notification for payment*/
            const notification = generatePendingPaymentNotification(carts[i].requestedBy, systemAdmin, carts[i].orders.length, paymentTypes.online, carts[i].id);
            await notification.save();
        }
    }
};

nodeSchedule.schedule(PAYMENT_JOB_SCHEDULE_EXPRESSION, async () => {
    console.log("Starting Cron Jobs");
    await checkForOfflinePayment();
    await checkForFailedOnlinePayment();
});

nodeSchedule.schedule(PAYMENT_JOB_SCHEDULE_EXPRESSION, async () => {
    await clearHtmlFiles();
});
