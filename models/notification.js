const moongose = require('mongoose');

const { Schema } = moongose;

const notificationSchema = new Schema({
    createdBy: {
        type: Number,
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
        type: Number,
        required: true,
    }
});


const Notification = moongose.model('notification', notificationSchema);
module.exports = Notification;
