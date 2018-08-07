const HttpStatus = require('http-status-codes');

const Service = require('../models/service');
const News = require('../models/news');
const Notification = require('../models/notification');
const User = require('../models/user');
const { filterResourceData } = require('../helpers/controllerHelpers');
const { accessControl } = require('./access');
const { resources } = require('../configuration');

const generateServiceCreatedMessage = async (service, daiictId) => {
    let message = "New service " + service.name + " created";
    
    if (service.isSpecialService) {
        generateNotification(message,daiictId,service.specialServiceUsers);
    } else {
        generateNews(message,daiictId);
    }
};


const generateServiceUpdatedMessage = async (service, daiictId) => {
    let message = "Service " + service.name + " updated";

    if (service.isSpecialService) {
        generateNotification(message,daiictId,service.specialServiceUsers);
    } else {
        generateNews(message,daiictId);
    }
};

const generateNews = async (message,daiictId) => {
    const news = new News({
        message,
        createdOn: new Date(),
        createdBy: daiictId
    });
    await news.save();
};

const generateNotification = async (message,daiictId,userIds) => {
    const notification = new Notification({
        message,
        createdOn: new Date(),
        createdBy: daiictId
    });
    await notification.save();

    userIds.forEach(userId=>{
        let user = await User.findOne({daiictId:userId});
        user.notifications.push(notification._id);
        await user.save();
    });
};

module.exports = {
    getAllServices: async (req, res, next) => {
        const { user } = req;
        const readPermission = accessControl.can(user.userType).readAny(resources.service);
        if (readPermission.granted) {
            const services = await Service.find({ isSpecialService: false, isActive: true });
            const filteredServices = filterResourceData(services, readPermission.attributes);
            res.status(HttpStatus.OK).json(filteredServices);
            
        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    addService: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const readPermission = accessControl.can(user.userType).readAny(resources.service);
        const createPermission = accessControl.can(user.userType).createAny(resources.service);

        if (createPermission.granted) {
            const currentTimestamp = new Date();
            let newServiceAtt = req.value.body;
            newServiceAtt.createdOn = currentTimestamp;
            newServiceAtt.createdBy = daiictId;

            const newService = new Service(newServiceAtt);
            const service = await newService.save();
            
            generateServiceCreatedMessage(service, daiictId);
            

            const filteredService = filterResourceData(service, readPermission.attributes);
            res.status(HttpStatus.CREATED).json(filteredService);
            
        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    getService: async (req, res, next) => {
        const { user } = req;
        const { serviceId } = req.params;
        const readPermission = accessControl.can(user.userType).readAny(resources.service);

        const service = await Service.findById(serviceId);
        if (readPermission.granted) {
            if (service.isSpecialService || (!readPermission.attributes.includes("isActive") && !service.isActive)) {
                res.sendStatus(HttpStatus.NO_CONTENT);
            } else {

                const filteredService = filterResourceData(service, readPermission.attributes);
                res.status(HttpStatus.OK).json(filteredService);
            }
        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    getSpecialService: async (req, res, next) => {
        const { user } = req;
        const { serviceId } = req.params;
        const readPermission = accessControl.can(user.userType).readAny(resources.service);

        if (readPermission.granted && user.specialServices.includes(serviceId)) {
            const service = await Service.findById(serviceId);
            if (!service.isSpecialService || (!readPermission.attributes.includes("isActive") && !service.isActive)) {
                res.sendStatus(HttpStatus.NO_CONTENT);
            } else {

                const filteredService = filterResourceData(service, readPermission.attributes);
                res.status(HttpStatus.OK).json(filteredService);
            }

        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    updateService: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { serviceId } = req.params;
        const readPermission = accessControl.can(user.userType).readAny(resources.service);
        const updateAnyPermission = accessControl.can(user.userType).updateAny(resources.service);
        const updateOwnPermission = accessControl.can(user.userType).updateOwn(resources.service);
        const service = await Service.findById(serviceId);

        if (updateAnyPermission.granted) {

            let newService = req.value.body;

            const result = await Service.findByIdAndUpdate(serviceId, newService, { new: true });
            const filteredService = filterResourceData(result, readPermission.attributes);
            generateServiceUpdatedMessage(result, daiictId);
            
            res.status(HttpStatus.ACCEPTED).json(filteredService);

        } else if (updateOwnPermission.granted && user.daiictId == service.createdBy) {

            let newService = req.value.body;
            newService.createdOn = new Date();

            const result = await Service.findByIdAndUpdate(serviceId, newService, { new: true });
            const filteredService = filterResourceData(result, readPermission.attributes);
            generateServiceUpdatedMessage(result, daiictId);

            res.status(HttpStatus.ACCEPTED).json(filteredService);

        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    deleteService: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { serviceId } = req.params;
        const deleteAnyPermission = accessControl.can(user.userType).deleteAny(resources.service);
        const deleteOwnPermission = accessControl.can(user.userType).deleteOwn(resources.service);
        const service = await Service.findById(serviceId);

        if (deleteAnyPermission.granted) {

            await Service.findByIdAndRemove(serviceId);
            res.status(HttpStatus.ACCEPTED).json({ success: true });

        } else if (deleteOwnPermission.granted && service.createdBy == daiictId) {

            await Service.findByIdAndRemove(serviceId);
            res.status(HttpStatus.ACCEPTED).json({ success: true });

        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },
};
