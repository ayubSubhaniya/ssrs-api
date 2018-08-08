const HttpStatus = require('http-status-codes');
const Notification = require('../models/notification')

const { filterResourceData } = require('../helpers/controllerHelpers');
const { NOTIFICATION_EXPIRY_TIME, resources} = require('../configuration');
const { accessControl } = require('./access');
const User = require('../models/user');

module.exports = {
    getAllNotification:  async (req, res, next)=>{
        const {user} = req; 
        const {daiictId} = user;
        const readOwnPermission = accessControl.can(user.userType).readOwn(resources.notification);
        const expiresInDays = NOTIFICATION_EXPIRY_TIME;

        if (readOwnPermission.granted){
            var startDate = new Date()
            startDate.setDate(startDate.getDate()-expiresInDays)

            const notification= await Notification.find({
                userId: daiictId,
                createdOn: {
                    $gte: startDate, $lt: new Date()
                }
            });

            if (notification){
                const filteredNotification = filterResourceData(notification,readOwnPermission.attributes);
                res.status(HttpStatus.ACCEPTED).json(filteredNotification);
            } else {
                res.sendStatus(HttpStatus.NO_CONTENT);
            }
            
        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    getNotification: async (req, res, next) => {
        const {user} = req; 
        const {daiictId} = user;
        const { notificationId } = req.params

        const readAnyPermission = accessControl.can(user.userType).readAny(resources.news);
        const readOwnPermission = accessControl.can(user.userType).readOwn(resources.news);

        if (readAnyPermission.granted){
            const notification = await Notification.findById(notificationId)
            if (notification){
                const filteredNotification = filterResourceData(notification,readAnyPermission.attributes);
                res.status(HttpStatus.OK).json(filteredNotification);
            } else {
                res.startDate(HttpStatus.NOT_ACCEPTABLE);
            }
        } else if (readOwnPermission.granted){
            const notification = await Notification.findOne({_id:notificationId,$or:[{createdBy:daiictId},{userId:daiictId}]});
            if (notification){
                const filteredNotification = filterResourceData(notification,readAnyPermission.attributes);
                res.status(HttpStatus.OK).json(filteredNotification);
            } else {
                res.startDate(HttpStatus.NOT_ACCEPTABLE);
            }
        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    addNotification: async (req, res, next) => {
        const {user} = req; 
        const { daiictId } = user;

        const createPermission = accessControl.can(user.userType).createOwn(resources.notification);
        const readPermission = accessControl.can(user.userType).readOwn(resources.notification);
        
        if (createPermission.granted){
            let notificationAtt = req.value.body
            notificationAtt.createdOn = new Date();
            notificationAtt.createdBy = daiictId;
            
            const newNotification = new Notification(notificationAtt);
            const notification = await newNotification.save();
            
            const filteredNotification = filterResourceData(notification,readPermission.attributes);
            res.status(HttpStatus.CREATED).json(filteredNotification);
        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
        
    },

    deleteNotification: async (req, res, next) => {
        const {user} = req;
        const {daiictId} = user;
        const { notificationId } = req.params;
        const deleteAnyPermission = accessControl.can(user.userType).deleteAny(resources.notification);
        const deleteOwnPermission = accessControl.can(user.userType).deleteOwn(resources.notification);

        if (deleteAnyPermission.granted){
            const notification = await Notification.findByIdAndRemove(notificationId);
            
            if (notification){
                res.sendStatus(HttpStatus.ACCEPTED);
            } else {
                res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
            }
        } else if (deleteOwnPermission.granted){
            const notification = await Notification.findOneAndRemove({_id:notificationId,createdBy:daiictId});
            if (notification){
                res.sendStatus(HttpStatus.ACCEPTED);
            } else {
                res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
            }
        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    deleteAllNotification: async (req, res, next) => {
        const {user} = req; 

        const deletePermission = accessControl.can(user.userType).deleteAny(resources.notification);
        if (deletePermission.granted) {
            await Notification.deleteMany({})
            res.sendStatus(HttpStatus.ACCEPTED);
        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    updateNotification: async (req, res, next) => {
        const {user} = req; 
        const {daiictId} = user;
        const { notificationId } = req.params;

        const updateAnyPermission = accessControl.can(user.userType).updateAny(resources.notification);
        const updateOwnPermission = accessControl.can(user.userType).updateOwn(resources.notification);
        const readAnyPermission = accessControl.can(user.userType).readAny(resources.notification);
        const readOwnPermission = accessControl.can(user.userType).readOwn(resources.notification);

        const newNotification = req.value.body;

        if (updateAnyPermission.granted){
            const notification = await Notification.findByIdAndUpdate(notificationId, newNotification, {new:true});
            
            if (notification){
                const filteredNotification = filterResourceData(notification, readAnyPermission.attributes);
                res.status(HttpStatus.ACCEPTED).json(filteredNotification);
            } else {
                res.status(HttpStatus.NOT_ACCEPTABLE);
            }
        } else if (updateOwnPermission.granted){
            const notification = await Notification.updateOne({_id:notificationId,createdBy:daiictId}, newNotification, {new:true});
            
            if (notification){
                const filteredNotification = filterResourceData(notification, readOwnPermission.attributes);
                res.status(HttpStatus.ACCEPTED).json(filteredNotification);
            } else {
                res.status(HttpStatus.NOT_ACCEPTABLE);
            }
        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },
}