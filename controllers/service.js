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
        generateNotification(message, daiictId, service.specialServiceUsers);
    } else {
        generateNews(message, daiictId);
    }
};


const generateServiceUpdatedMessage = async (service, daiictId) => {
    let message = "Service " + service.name + " updated";

    if (service.isSpecialService) {
        generateNotification(message, daiictId, service.specialServiceUsers);
    } else {
        generateNews(message, daiictId);
    }
};

const generateNews = async (message, daiictId) => {
    const news = new News({
        message,
        createdOn: new Date(),
        createdBy: daiictId
    });
    await news.save();
};

const generateNotification = async (message, daiictId, userIds) => {
    const notification = new Notification({
        message,
        createdOn: new Date(),
        createdBy: daiictId
    });
    await notification.save();

    userIds.forEach(async (userId)=>{
        let user = await User.findOne({ daiictId: userId });
        user.notifications.push(notification._id);
        await user.save();
    });
};

module.exports = {
    getAllServices: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;

        const readAnyInActiveService = accessControl.can(user.userType).readAny(resources.inActiveService);
        const readOwnInActiveService = accessControl.can(user.userType).readOwn(resources.inActiveService);
        const readPermission = accessControl.can(user.userType).readAny(resources.service);

        if (readPermission.granted) {
            let services;
            if (readAnyInActiveService.granted) {
                services = await Service.find({ isSpecialService: false });
            } else if (readOwnInActiveService.granted) {
                services = await Service.find({ isSpecialService: false, $or: [{ createdBy: daiictId, isActive: true }] });
            } else {
                services = await Service.find({ isSpecialService: false, isActive: true });
            }

            if (services){
                const filteredServices = filterResourceData(services, readPermission.attributes);
                res.status(HttpStatus.OK).json(filteredServices);
            } else {
                res.sendStatus(HttpStatus.NO_CONTENT);
            }

        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    getAllSpecialServices: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;

        const readAnyInActiveService = accessControl.can(user.userType).readAny(resources.inActiveService);
        const readOwnInActiveService = accessControl.can(user.userType).readOwn(resources.inActiveService);
        const readAnySpecialService = accessControl.can(user.userType).readAny(resources.specialService);
        const readOwnSpecialService = accessControl.can(user.userType).readOwn(resources.specialService);
        const readPermission = accessControl.can(user.userType).readAny(resources.service);


        if (readPermission.granted && readOwnSpecialService.granted) {
            let services;

            if (readAnySpecialService.granted) {
                if (readAnyInActiveService.granted) {
                    services = await Service.find({ isSpecialService: true });
                } else if (readOwnInActiveService.granted) {
                    services = await Service.find({ isSpecialService: true, $or: [{ createdBy: daiictId, isActive: true }] });
                } else {
                    services = await Service.find({ isSpecialService: true, isActive: true });
                }
            } else if (readOwnSpecialService.granted) {
                if (readAnyInActiveService.granted || readOwnInActiveService.granted) {
                    services = await Service.find({ isSpecialService: true, createdBy: daiictId });
                } else {
                    services = await Service.find({ isSpecialService: true, isActive: true });
                }
            }

            if (services){
                const filteredServices = filterResourceData(services, readPermission.attributes);
                res.status(HttpStatus.OK).json(filteredServices);
            } else {
                res.sendStatus(HttpStatus.NO_CONTENT);
            }

        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    getService: async (req, res, next) => {
        const { user } = req;
        const {daiictId} = user;
        const { serviceId } = req.params;

        const readPermission = accessControl.can(user.userType).readAny(resources.service);
        const readAnyInActiveService = accessControl.can(user.userType).readAny(resources.inActiveService);
        const readOwnInActiveService = accessControl.can(user.userType).readOwn(resources.inActiveService);

        if (readPermission.granted) {
            let service;

            if (readAnyInActiveService.granted) {
                service = await Service.findById(serviceId);
            } else if (readOwnInActiveService.granted) {
                service = await Service.findOne({ _id: serviceId, $or: [{ createdBy: daiictId }, { isActive: true }] });
            } else {
                service = await Service.findOne({ _id: serviceId, isActive: true });
            }

            if (service==undefined){
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
        const { daiictId } = user;
        const { serviceId } = req.params;

        const readAnyInActiveService = accessControl.can(user.userType).readAny(resources.inActiveService);
        const readOwnInActiveService = accessControl.can(user.userType).readOwn(resources.inActiveService);
        const readAnySpecialService = accessControl.can(user.userType).readAny(resources.specialService);
        const readOwnSpecialService = accessControl.can(user.userType).readOwn(resources.specialService);
        const readPermission = accessControl.can(user.userType).readAny(resources.service);

        if (readPermission.granted) {
            let service;

            if (readAnySpecialService.granted) {
                if (readAnyInActiveService.granted) {
                    service = await Service.find({ _id: serviceId, isSpecialService: true });
                } else if (readOwnInActiveService.granted) {
                    service = await Service.find({ _id: serviceId, isSpecialService: true, $or: [{ createdBy: daiictId, isActive: true }] });
                } else {
                    service = await Service.find({ _id: serviceId, isSpecialService: true, isActive: true });
                }
            } else if (readOwnSpecialService.granted) {
                if (readAnyInActiveService.granted || readOwnInActiveService.granted) {
                    service = await Service.find({ _id: serviceId, isSpecialService: true, createdBy: daiictId });
                } else {
                    service = await Service.find({ _id: serviceId, isSpecialService: true, isActive: true });
                }
            } else {
                service = await Service.find({ _id: serviceId, specialServiceUsers: daiictId })
            }

            if (service==undefined){
                res.sendStatus(HttpStatus.NO_CONTENT);
            } else {
                const filteredServices = filterResourceData(service, readPermission.attributes);
                res.status(HttpStatus.OK).json(filteredServices);
            }
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

    //should add special service access control for update?
    updateService: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { serviceId } = req.params;

        const readPermission = accessControl.can(user.userType).readAny(resources.service);
        const updateAnyPermission = accessControl.can(user.userType).updateAny(resources.service);
        const updateOwnPermission = accessControl.can(user.userType).updateOwn(resources.service);

        if (updateAnyPermission.granted) {

            let newService = req.value.body;

            const result = await Service.findByIdAndUpdate(serviceId, newService, { new: true });
            const filteredService = filterResourceData(result, readPermission.attributes);
            generateServiceUpdatedMessage(result, daiictId);

            res.status(HttpStatus.ACCEPTED).json(filteredService);

        } else if (updateOwnPermission.granted) {

            let newService = req.value.body;
            newService.createdOn = new Date();

            const result = await Service.updateOne({ _id: serviceId, createdBy: daiictId }, newService, { new: true });
            const filteredService = filterResourceData(result, readPermission.attributes);
            generateServiceUpdatedMessage(result, daiictId);

            res.status(HttpStatus.ACCEPTED).json(filteredService);

        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    //use result to know whether service is delete or not
    deleteService: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { serviceId } = req.params;
        const deleteAnyPermission = accessControl.can(user.userType).deleteAny(resources.service);
        const deleteOwnPermission = accessControl.can(user.userType).deleteOwn(resources.service);

        if (deleteAnyPermission.granted) {

            const result = await Service.findByIdAndRemove(serviceId);
            
            if (result){
                res.sendStatus(HttpStatus.ACCEPTED);
            } else {
                res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
            }
            

        } else if (deleteOwnPermission.granted) {

            const result = await Service.findByOneAndRemove({ _id: serviceId, createdBy: daiictId });
            
            if (result){
                res.sendStatus(HttpStatus.ACCEPTED);
            } else {
                res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
            }

        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },
};
