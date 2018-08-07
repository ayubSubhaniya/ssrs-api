const HttpStatus = require('http-status-codes');
const Notification = require('../models/notification')

const expiresInDays = 8

module.exports = {
    getAllNotification:  async (req, res, next)=>{
        var startDate = new Date()
        startDate.setDate(startDate.getDate()-expiresInDays)

        const notification= await Notification.find({
        "createdOn": {
            "$gte": startDate, "$lt": new Date()
        }});

        res.status(201).json(notification);
    },

    addNotification: async (req, res, next) => {
        const {message} = req.body
        const createdOn = new Date()
        const newNotification = new Notification({
            message,
            createdOn
        });
        const notification = await newNotification.save();
        res.status(201).json(notification);
    },

    deleteNotification: async (req, res, next) => {
        const { notificationId } = req.params;
        const notification = await Notification.findByIdAndRemove(notificationId);
        res.status(200).json({success:true});
    },

    deleteAllNotification: async (req, res, next) => {
        await Notification.deleteMany({})
        res.status(200).json({success:true})
    },

    getNotification: async (req, res, next) => {
        const { notificationId } = req.params
        const notification = await Notification.findById(notificationId)
        res.status(200).json(notification)
    },

    replaceNotification: async (req, res, next) => {
        const { notificationId } = req.params;
        const newNotification = req.body;
        const result = await Notification.replaceOne({"_id":notificationId}, newNotification, {new:true});
        res.status(200).json(newNotification);
    },

    updateNotification: async (req, res, next) => {
        const { notificationId } = req.params;
        const newnotification = req.body;
        const result = await Notification.findByIdAndUpdate(notificationId, newnotification, {new:true});
        res.status(200).json(newnotification);
    },
}