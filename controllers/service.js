const HttpStatus = require('http-status-codes');

const Service = require('../models/service');
const News = require('../models/news');
const Notification = require('../models/notification');
const { filterResourceData } = require('../helpers/controllerHelpers');
const { accessControl } = require('./access');
const { resources } = require('../configuration');

const generateNews = async (message, daiictId) => {
    const news = new News({
        message,
        createdOn: new Date(),
        createdBy: daiictId
    });
    await news.save();
};

const generateNotification = async (message, daiictId, userIds) => {

    userIds.forEach(async (userId) => {
        const notification = new Notification({
            message,
            createdOn: new Date(),
            createdBy: daiictId,
            userId
        });
        await notification.save();
    });
};

const generateServiceCreatedMessage = async (service, daiictId) => {
    let message = 'New service ' + service.name + ' created';

    if (service.isSpecialService) {
        await generateNotification(message, daiictId, service.specialServiceUsers);
    } else {
        await generateNews(message, daiictId);
    }
};


const generateServiceUpdatedMessage = async (service, daiictId) => {
    let message = 'Service ' + service.name + ' updated';

    if (service.isSpecialService) {
        await generateNotification(message, daiictId, service.specialServiceUsers);
    } else {
        await generateNews(message, daiictId);
    }
};

module.exports = {
    getAllServices: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;

        const readAnyInActiveService = accessControl.can(user.userType)
            .readAny(resources.inActiveResource);
        const readOwnInActiveService = accessControl.can(user.userType)
            .readOwn(resources.inActiveResource);
        const readServicePermission = accessControl.can(user.userType)
            .readAny(resources.service);
        const readParameterPermission = accessControl.can(user.userType)
            .readAny(resources.parameter);
        const readCollectionTypePermission = accessControl.can(user.userType)
            .readAny(resources.collectionType);


        if (readServicePermission.granted) {
            let services;
            if (readAnyInActiveService.granted) {
                services = await Service.find({ isSpecialService: false })
                    .populate({
                        path: 'collectionTypes',
                        select: readCollectionTypePermission.attributes
                    })
                    .populate({
                        path: 'availableParameters',
                        select: readParameterPermission.attributes
                    })
                    .exec();
            } else if (readOwnInActiveService.granted) {
                services = await Service.find({
                    isSpecialService: false,
                    $or: [{ createdBy: daiictId }, { isActive: true }]
                })
                    .populate({
                        path: 'collectionTypes',
                        select: readCollectionTypePermission.attributes
                    })
                    .populate({
                        path: 'availableParameters',
                        select: readParameterPermission.attributes
                    })
                    .exec();
            } else {
                services = await Service.find({
                    isSpecialService: false,
                    isActive: true
                })
                    .populate({
                        path: 'collectionTypes',
                        select: readCollectionTypePermission.attributes
                    })
                    .populate({
                        path: 'availableParameters',
                        select: readParameterPermission.attributes
                    })
                    .exec();
            }

            if (services) {
                const filteredServices = filterResourceData(services, readServicePermission.attributes);
                res.status(HttpStatus.OK)
                    .json({ service: filteredServices });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }

        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    getAllSpecialServices: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;

        const readAnyInActiveService = accessControl.can(user.userType)
            .readAny(resources.inActiveResource);
        const readOwnInActiveService = accessControl.can(user.userType)
            .readOwn(resources.inActiveResource);
        const readAnySpecialService = accessControl.can(user.userType)
            .readAny(resources.specialService);
        const readOwnSpecialService = accessControl.can(user.userType)
            .readOwn(resources.specialService);
        const readPermission = accessControl.can(user.userType)
            .readAny(resources.service);
        const readParameterPermission = accessControl.can(user.userType)
            .readAny(resources.parameter);
        const readCollectionTypePermission = accessControl.can(user.userType)
            .readAny(resources.collectionType);


        if (readPermission.granted) {
            let services;

            if (readAnySpecialService.granted) {
                if (readAnyInActiveService.granted) {
                    services = await Service.find({ isSpecialService: true })
                        .populate({
                            path: 'collectionTypes',
                            select: readCollectionTypePermission.attributes
                        })
                        .populate({
                            path: 'availableParameters',
                            select: readParameterPermission.attributes
                        })
                        .exec();
                } else if (readOwnInActiveService.granted) {
                    services = await Service.find({
                        isSpecialService: true,
                        $or: [{ createdBy: daiictId }, { isActive: true }]
                    })
                        .populate({
                            path: 'collectionTypes',
                            select: readCollectionTypePermission.attributes
                        })
                        .populate({
                            path: 'availableParameters',
                            select: readParameterPermission.attributes
                        })
                        .exec();
                } else {
                    services = await Service.find({
                        isSpecialService: true,
                        isActive: true
                    })
                        .populate({
                            path: 'collectionTypes',
                            select: readCollectionTypePermission.attributes
                        })
                        .populate({
                            path: 'availableParameters',
                            select: readParameterPermission.attributes
                        })
                        .exec();
                }
            } else if (readOwnSpecialService.granted) {
                if (readOwnInActiveService.granted) {
                    services = await Service.find({
                        isSpecialService: true,
                        createdBy: daiictId
                    })
                        .populate({
                            path: 'collectionTypes',
                            select: readCollectionTypePermission.attributes
                        })
                        .populate({
                            path: 'availableParameters',
                            select: readParameterPermission.attributes
                        })
                        .exec();
                } else {
                    services = await Service.find({
                        isSpecialService: true,
                        isActive: true,
                        createdBy: daiictId
                    })
                        .populate({
                            path: 'collectionTypes',
                            select: readCollectionTypePermission.attributes
                        })
                        .populate({
                            path: 'availableParameters',
                            select: readParameterPermission.attributes
                        })
                        .exec();
                }
            } else {
                services = await Service.find({
                    isSpecialService: true,
                    isActive: true,
                    specialServiceUsers: daiictId
                })
                    .populate({
                        path: 'collectionTypes',
                        select: readCollectionTypePermission.attributes
                    })
                    .populate({
                        path: 'availableParameters',
                        select: readParameterPermission.attributes
                    })
                    .exec();
            }

            if (services) {
                const filteredServices = filterResourceData(services, readPermission.attributes);
                res.status(HttpStatus.OK)
                    .json({ service: filteredServices });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }

        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    getService: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { serviceId } = req.params;

        const readPermission = accessControl.can(user.userType)
            .readAny(resources.service);
        const readAnyInActiveService = accessControl.can(user.userType)
            .readAny(resources.inActiveResource);
        const readOwnInActiveService = accessControl.can(user.userType)
            .readOwn(resources.inActiveResource);
        const readParameterPermission = accessControl.can(user.userType)
            .readAny(resources.parameter);
        const readCollectionTypePermission = accessControl.can(user.userType)
            .readAny(resources.collectionType);

        if (readPermission.granted) {
            let service;

            if (readAnyInActiveService.granted) {
                service = await Service.findById(serviceId)
                    .populate({
                        path: 'collectionTypes',
                        select: readCollectionTypePermission.attributes
                    })
                    .populate({
                        path: 'availableParameters',
                        select: readParameterPermission.attributes
                    })
                    .exec();
            } else if (readOwnInActiveService.granted) {
                service = await Service.findOne({
                    _id: serviceId,
                    $or: [{ createdBy: daiictId }, { isActive: true }]
                })
                    .populate({
                        path: 'collectionTypes',
                        select: readCollectionTypePermission.attributes
                    })
                    .populate({
                        path: 'availableParameters',
                        select: readParameterPermission.attributes
                    })
                    .exec();
            } else {
                service = await Service.findOne({
                    _id: serviceId,
                    isActive: true
                })
                    .populate({
                        path: 'collectionTypes',
                        select: readCollectionTypePermission.attributes
                    })
                    .populate({
                        path: 'availableParameters',
                        select: readParameterPermission.attributes
                    })
                    .exec();
            }

            if (service) {
                const filteredService = filterResourceData(service, readPermission.attributes);
                res.status(HttpStatus.OK)
                    .json({ service: filteredService });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }

        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    getSpecialService: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { serviceId } = req.params;

        const readAnyInActiveService = accessControl.can(user.userType)
            .readAny(resources.inActiveResource);
        const readOwnInActiveService = accessControl.can(user.userType)
            .readOwn(resources.inActiveResource);
        const readAnySpecialService = accessControl.can(user.userType)
            .readAny(resources.specialService);
        const readOwnSpecialService = accessControl.can(user.userType)
            .readOwn(resources.specialService);
        const readPermission = accessControl.can(user.userType)
            .readAny(resources.service);
        const readParameterPermission = accessControl.can(user.userType)
            .readAny(resources.parameter);
        const readCollectionTypePermission = accessControl.can(user.userType)
            .readAny(resources.collectionType);

        if (readPermission.granted) {
            let service;

            if (readAnySpecialService.granted) {
                if (readAnyInActiveService.granted) {
                    service = await Service.find({
                        _id: serviceId,
                        isSpecialService: true
                    })
                        .populate({
                            path: 'collectionTypes',
                            select: readCollectionTypePermission.attributes
                        })
                        .populate({
                            path: 'availableParameters',
                            select: readParameterPermission.attributes
                        })
                        .exec();
                } else if (readOwnInActiveService.granted) {
                    service = await Service.find({
                        _id: serviceId,
                        isSpecialService: true,
                        $or: [{ createdBy: daiictId }, { isActive: true }]
                    })
                        .populate({
                            path: 'collectionTypes',
                            select: readCollectionTypePermission.attributes
                        })
                        .populate({
                            path: 'availableParameters',
                            select: readParameterPermission.attributes
                        })
                        .exec();
                } else {
                    service = await Service.find({
                        _id: serviceId,
                        isSpecialService: true,
                        isActive: true
                    })
                        .populate({
                            path: 'collectionTypes',
                            select: readCollectionTypePermission.attributes
                        })
                        .populate({
                            path: 'availableParameters',
                            select: readParameterPermission.attributes
                        })
                        .exec();
                }
            } else if (readOwnSpecialService.granted) {
                if (readAnyInActiveService.granted || readOwnInActiveService.granted) {
                    service = await Service.find({
                        _id: serviceId,
                        isSpecialService: true,
                        createdBy: daiictId
                    })
                        .populate({
                            path: 'collectionTypes',
                            select: readCollectionTypePermission.attributes
                        })
                        .populate({
                            path: 'availableParameters',
                            select: readParameterPermission.attributes
                        })
                        .exec();
                } else {
                    service = await Service.find({
                        _id: serviceId,
                        isSpecialService: true,
                        isActive: true
                    })
                        .populate({
                            path: 'collectionTypes',
                            select: readCollectionTypePermission.attributes
                        })
                        .populate({
                            path: 'availableParameters',
                            select: readParameterPermission.attributes
                        })
                        .exec();
                }
            } else {
                service = await Service.find({
                    _id: serviceId,
                    specialServiceUsers: daiictId
                })
                    .populate({
                        path: 'collectionTypes',
                        select: readCollectionTypePermission.attributes
                    })
                    .populate({
                        path: 'availableParameters',
                        select: readParameterPermission.attributes
                    })
                    .exec();
            }

            if (service) {
                const filteredServices = filterResourceData(service, readPermission.attributes);
                res.status(HttpStatus.OK)
                    .json({ service: filteredServices });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    addService: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const readPermission = accessControl.can(user.userType)
            .readAny(resources.service);
        const createPermission = accessControl.can(user.userType)
            .createAny(resources.service);
        const readParameterPermission = accessControl.can(user.userType)
            .readAny(resources.parameter);
        const readCollectionTypePermission = accessControl.can(user.userType)
            .readAny(resources.collectionType);

        if (createPermission.granted) {
            const currentTimestamp = new Date();
            let newServiceAtt = req.value.body;
            newServiceAtt.createdOn = currentTimestamp;
            newServiceAtt.createdBy = daiictId;

            //populate service with parameters and collection
            const newService = new Service(newServiceAtt);
            const service = await newService.save();

            await generateServiceCreatedMessage(service, daiictId);


            const filteredService = filterResourceData(service, readPermission.attributes);
            res.status(HttpStatus.CREATED)
                .json({ service: filteredService });

        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    //should add special service and inActive access control for update?
    updateService: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { serviceId } = req.params;

        const readPermission = accessControl.can(user.userType)
            .readAny(resources.service);
        const updateAnyPermission = accessControl.can(user.userType)
            .updateAny(resources.service);
        const updateOwnPermission = accessControl.can(user.userType)
            .updateOwn(resources.service);
        const readParameterPermission = accessControl.can(user.userType)
            .readAny(resources.parameter);
        const readCollectionTypePermission = accessControl.can(user.userType)
            .readAny(resources.collectionType);

        if (updateAnyPermission.granted) {

            let newService = req.value.body;

            const service = await Service.findByIdAndUpdate(serviceId, newService, { new: true })
                .populate({
                    path: 'collectionTypes',
                    select: readCollectionTypePermission.attributes
                })
                .populate({
                    path: 'availableParameters',
                    select: readParameterPermission.attributes
                })
                .exec();
            if (service) {
                const filteredService = filterResourceData(service, readPermission.attributes);
                await generateServiceUpdatedMessage(service, daiictId);

                res.status(HttpStatus.OK)
                    .json({ service: filteredService });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }


        } else if (updateOwnPermission.granted) {

            let newService = req.value.body;
            newService.createdOn = new Date();

            const service = await Service.updateOne({
                _id: serviceId,
                createdBy: daiictId
            }, newService, { new: true })
                .populate({
                    path: 'collectionTypes',
                    select: readCollectionTypePermission.attributes
                })
                .populate({
                    path: 'availableParameters',
                    select: readParameterPermission.attributes
                })
                .exec();

            if (service){
                const filteredService = filterResourceData(service, readPermission.attributes);
                await generateServiceUpdatedMessage(service, daiictId);

                res.status(HttpStatus.OK)
                    .json({ service: filteredService });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }

        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    changeStatus: async (req, res, next) => {
        const { user } = req;
        const { serviceId } = req.params;

        const changeStatusPermission = accessControl.can(user.userType)
            .updateAny(resources.changeResourceStatus);
        const readPermission = accessControl.can(user.userType)
            .readAny(resources.service);

        if (changeStatusPermission.granted) {
            const serviceUpdateAtt = req.value.body;
            const updatedService = await Service.findByIdAndUpdate(serviceId, serviceUpdateAtt, { new: true });
            if (updatedService) {
                const filteredParameter = filterResourceData(updatedService, readPermission.attributes);
                res.status(HttpStatus.OK)
                    .json({ user: filteredParameter });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },


    deleteService: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { serviceId } = req.params;
        const deleteAnyPermission = accessControl.can(user.userType)
            .deleteAny(resources.service);
        const deleteOwnPermission = accessControl.can(user.userType)
            .deleteOwn(resources.service);

        if (deleteAnyPermission.granted) {

            const service = await Service.findByIdAndRemove(serviceId);

            if (service) {
                res.sendStatus(HttpStatus.OK);
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }


        } else if (deleteOwnPermission.granted) {

            const service = await Service.findOneAndRemove({
                _id: serviceId,
                createdBy: daiictId
            });

            if (service) {
                res.sendStatus(HttpStatus.OK);
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }

        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },
};
