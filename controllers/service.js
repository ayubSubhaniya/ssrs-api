const HttpStatus = require('http-status-codes');

const Service = require('../models/service');
const News = require('../models/news');
const Notification = require('../models/notification');
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

    userIds.forEach(async (userId)=>{
        const notification = new Notification({
            message,
            createdOn: new Date(),
            createdBy: daiictId,
            userId
        });
        await notification.save();
    });
};

module.exports = {
    getAllServices: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;

        const readAnyInActiveService = accessControl.can(user.userType).readAny(resources.inActiveResource);
        const readOwnInActiveService = accessControl.can(user.userType).readOwn(resources.inActiveResource);
        const readPermission = accessControl.can(user.userType).readAny(resources.service);

        if (readPermission.granted) {
            let services;
            if (readAnyInActiveService.granted) {
                services = await Service.find({ isSpecialService: false });
            } else if (readOwnInActiveService.granted) {
                services = await Service.find({ isSpecialService: false, $or: [{ createdBy: daiictId}, {isActive: true }] });
            } else {
                services = await Service.find({ isSpecialService: false, isActive: true });
            }

            if (services){
                const filteredServices = filterResourceData(services, readPermission.attributes);
                res.status(HttpStatus.OK).json({service:filteredServices});
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

        const readAnyInActiveService = accessControl.can(user.userType).readAny(resources.inActiveResource);
        const readOwnInActiveService = accessControl.can(user.userType).readOwn(resources.inActiveResource);
        const readAnySpecialService = accessControl.can(user.userType).readAny(resources.specialService);
        const readOwnSpecialService = accessControl.can(user.userType).readOwn(resources.specialService);
        const readPermission = accessControl.can(user.userType).readAny(resources.service);


        if (readPermission.granted && readOwnSpecialService.granted) {
            let services;

            if (readAnySpecialService.granted) {
                if (readAnyInActiveService.granted) {
                    services = await Service.find({ isSpecialService: true });
                } else if (readOwnInActiveService.granted) {
                    services = await Service.find({ isSpecialService: true, $or: [{ createdBy: daiictId}, {isActive: true }] });
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
                res.status(HttpStatus.OK).json({service:filteredServices});
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
        const readAnyInActiveService = accessControl.can(user.userType).readAny(resources.inActiveResource);
        const readOwnInActiveService = accessControl.can(user.userType).readOwn(resources.inActiveResource);

        if (readPermission.granted) {
            let service;

            if (readAnyInActiveService.granted) {
                service = await Service.findById(serviceId);
            } else if (readOwnInActiveService.granted) {
                service = await Service.findOne({ _id: serviceId, $or: [{ createdBy: daiictId }, { isActive: true }] });
            } else {
                service = await Service.findOne({ _id: serviceId, isActive: true });
            }

            if (service){
                const filteredService = filterResourceData(service, readPermission.attributes);
                res.status(HttpStatus.OK).json({service:filteredService});
            } else {
                res.sendStatus(HttpStatus.NO_CONTENT);
            }

        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    getSpecialService: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { serviceId } = req.params;

        const readAnyInActiveService = accessControl.can(user.userType).readAny(resources.inActiveResource);
        const readOwnInActiveService = accessControl.can(user.userType).readOwn(resources.inActiveResource);
        const readAnySpecialService = accessControl.can(user.userType).readAny(resources.specialService);
        const readOwnSpecialService = accessControl.can(user.userType).readOwn(resources.specialService);
        const readPermission = accessControl.can(user.userType).readAny(resources.service);

        if (readPermission.granted) {
            let service;

            if (readAnySpecialService.granted) {
                if (readAnyInActiveService.granted) {
                    service = await Service.find({ _id: serviceId, isSpecialService: true });
                } else if (readOwnInActiveService.granted) {
                    service = await Service.find({ _id: serviceId, isSpecialService: true, $or: [{ createdBy: daiictId}, {isActive: true }] });
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

            if (service){
                const filteredServices = filterResourceData(service, readPermission.attributes);
                res.status(HttpStatus.OK).json({service:filteredServices});
            } else {
                res.sendStatus(HttpStatus.NO_CONTENT);
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
            res.status(HttpStatus.CREATED).json({service:filteredService});

        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    //should add special service and inActive access control for update?
    updateService: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { serviceId } = req.params;

        const readPermission = accessControl.can(user.userType).readAny(resources.service);
        const updateAnyPermission = accessControl.can(user.userType).updateAny(resources.service);
        const updateOwnPermission = accessControl.can(user.userType).updateOwn(resources.service);

        if (updateAnyPermission.granted) {

            let newService = req.value.body;

            const service = await Service.findByIdAndUpdate(serviceId, newService, { new: true });
            const filteredService = filterResourceData(service, readPermission.attributes);
            generateServiceUpdatedMessage(service, daiictId);

            res.status(HttpStatus.ACCEPTED).json({service:filteredService});

        } else if (updateOwnPermission.granted) {

            let newService = req.value.body;
            newService.createdOn = new Date();

            const service = await Service.updateOne({ _id: serviceId, createdBy: daiictId }, newService, { new: true });
            const filteredService = filterResourceData(service, readPermission.attributes);
            generateServiceUpdatedMessage(service, daiictId);

            res.status(HttpStatus.ACCEPTED).json({service:filteredService});

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

        if (deleteAnyPermission.granted) {

            const service = await Service.findByIdAndRemove(serviceId);
            
            if (service){
                res.sendStatus(HttpStatus.ACCEPTED);
            } else {
                res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
            }
            

        } else if (deleteOwnPermission.granted) {

            const service = await Service.findByOneAndRemove({ _id: serviceId, createdBy: daiictId });
            
            if (service){
                res.sendStatus(HttpStatus.ACCEPTED);
            } else {
                res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
            }

        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },
};
