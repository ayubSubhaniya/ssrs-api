const moongose = require('mongoose');

const { Schema } = moongose;

const notificationSchema = new Schema({
    createdBy: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true,
    },
    createdOn: {
        type: Date,
        required: true,
    },
    userId: {
        type: String,
        required: true,
    },
    cartId: {
        type: String,
        default: undefined,
    }
});


const Notification = moongose.model('notification', notificationSchema);
module.exports = Notification;
