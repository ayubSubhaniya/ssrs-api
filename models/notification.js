const moongose = require('mongoose');

const { Schema } = moongose;

const notificationSchema = new Schema({
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    message: "String",
    createdOn : {
        type:Date,
        default:new Date()
    }
});


const Notification = moongose.model('notification', notificationSchema);
module.exports = Notification;
