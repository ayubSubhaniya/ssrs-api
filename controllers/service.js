const HttpStatus = require('http-status-codes');

const Order = require('../models/order');
const Cart = require('../models/cart');
const { resources, systemAdmin, allAdmin } = require('../configuration');
const Service = require('../models/service');
const News = require('../models/news');
const Notification = require('../models/notification');
const { filterResourceData, filterActiveData } = require('../helpers/controllerHelpers');
const { accessControl } = require('./access');
const { generateCustomNotification } = require('../helpers/notificationHelper');
const { generateNews } = require('../helpers/newsHelper');
const { getAllPopulatedCollectionType } = require('./collectionType');
const { getAllPopulatedParameters } = require('./parameter');
const { getAllTypesDistinctValues } = require('./userInfo');
const { StringFormatter } = require('../helpers/commonHelpers');
const { SERVICE_CREATED, SERVICE_UPDATED, SERVICE_STATUS_CHANGE, INVALID_ORDER_DUE_TO_SERVICE, ADMIN_SERVICE_DELETED } = require('../constants/strings');


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
    let message = StringFormatter(SERVICE_CREATED, [service.name]);

    if (service.isSpecialService) {
        await generateNotification(message, daiictId, service.specialServiceUsers);
    } else {
        await generateNews(message, daiictId, service._id);
    }
};


const generateServiceUpdatedMessage = async (service, daiictId) => {
    let message = StringFormatter(SERVICE_UPDATED, [service.name]);

    if (service.isSpecialService) {
        await generateNotification(message, daiictId, service.specialServiceUsers);
    } else {
        await generateNews(message, daiictId, service._id);
    }
};

const generateServiceChangeStatusMessage = async (service, daiictId) => {
    let args = [service.name, (service.isActive ? 'active' : 'inactive')];
    let message = StringFormatter(SERVICE_STATUS_CHANGE, args);

    if (service.isSpecialService) {
        await generateNotification(message, daiictId, service.specialServiceUsers);
    } else {
        await generateNews(message, daiictId, service._id);
    }
};

const deleteCurrServiceNews = async (currServiceId) => {
    await News.deleteMany({ serviceId: currServiceId });
};

const removeOrderWithDeletedService = async (serviceId) => {

    const orders = await Order.find({ service: serviceId });
    for (let i = 0; i < orders.length; i++) {

        await Order.findByIdAndRemove(orders[i]._id);

        await Cart.findByIdAndUpdate(orders[i].cartId, {
            '$pull': {
                'orders': orders[i]._id
            }
        });

        let message = INVALID_ORDER_DUE_TO_SERVICE;
        const notification = generateCustomNotification(orders[i].requestedBy, systemAdmin, message, orders[i].cartId);
        await notification.save();
    }
};

const getRequiredInfoForService = async (user) => {
    const collectionTypes = await getAllPopulatedCollectionType(user);
    const parameters = await getAllPopulatedParameters(user);
    const distinctValues = await getAllTypesDistinctValues();
    return {
        collectionType: collectionTypes,
        parameter: parameters,
        distinctValues
    };
};

module.exports = {
    getAllServices: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;

        const readInActiveService = accessControl.can(user.userType)
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
            if (readInActiveService.granted) {
                services = await Service.find()
                    .populate({
                        path: 'collectionTypes',
                        select: readCollectionTypePermission.attributes
                    })
                    .populate({
                        path: 'availableParameters',
                        select: readParameterPermission.attributes
                    });
            } else if (readOwnInActiveService.granted) {
                services = await Service.find({
                    $or: [{ createdBy: daiictId }, { isActive: true }]
                })
                    .populate({
                        path: 'collectionTypes',
                        select: readCollectionTypePermission.attributes
                    })
                    .populate({
                        path: 'availableParameters',
                        select: readParameterPermission.attributes
                    });
            } else {
                services = await Service.find({
                    isActive: true,
                    $or: [{
                        isSpecialService: false,
                        allowedProgrammes: { $in: [user.userInfo.user_programme, '*'] },
                        allowedBatches: { $in: [user.userInfo.user_batch, '*'] },
                        allowedUserTypes: { $in: [user.userInfo.user_type, '*'] },
                        allowedUserStatus: { $in: [user.userInfo.user_status, '*'] }
                    }, {
                        isSpecialService: true,
                        specialServiceUsers: daiictId
                    }]
                })
                    .populate({
                        path: 'collectionTypes',
                        select: readCollectionTypePermission.attributes
                    })
                    .populate({
                        path: 'availableParameters',
                        select: readParameterPermission.attributes
                    });

                // Allowing only those parameters which are active
                for (let i = 0; i < services.length; i++) {
                    services[i].availableParameters = filterActiveData(services[i].availableParameters);
                    services[i].collectionTypes = filterActiveData(services[i].collectionTypes)
                }
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

    /* Further improvement
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

                    // Allowing only those parameters which are active
                    for (let i = 0; i < services.length; i++) {
                        services[i].availableParameters = filterActiveData(services[i].availableParameters);
                    }
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

                    // Allowing only those parameters which are active
                    for (let i = 0; i < services.length; i++) {
                        services[i].availableParameters = filterActiveData(services[i].availableParameters);
                    }
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

                // Allowing only those parameters which are active
                for (let i = 0; i < services.length; i++) {
                    services[i].availableParameters = filterActiveData(services[i].availableParameters);
                }
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
    */

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
                    });
            } else if (readOwnInActiveService.granted) {
                service = await Service.find({
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
                    });
            } else {
                service = await Service.findOne({
                    _id: serviceId,
                    isActive: true,
                    $or: [{
                        isSpecialService: false,
                        allowedProgrammes: { $in: [user.userInfo.user_programme, '*'] },
                        allowedBatches: { $in: [user.userInfo.user_batch, '*'] },
                        allowedUserTypes: { $in: [user.userInfo.user_type, '*'] },
                        allowedUserStatus: { $in: [user.userInfo.user_status, '*'] }
                    }, {
                        isSpecialService: true,
                        specialServiceUsers: daiictId
                    }]
                })
                    .populate({
                        path: 'collectionTypes',
                        select: readCollectionTypePermission.attributes
                    })
                    .populate({
                        path: 'availableParameters',
                        select: readParameterPermission.attributes
                    });

                if (!service) {
                    return res.sendStatus(HttpStatus.NOT_FOUND);
                }
                // Allowing only those parameters which are active
                service.availableParameters = filterActiveData(service.availableParameters);
                service.collectionTypes = filterActiveData(service.collectionTypes)
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

    getServiceWithExtraDetails: async (req, res, next) => {
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
                    });
            } else if (readOwnInActiveService.granted) {
                service = await Service.find({
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
                    });
            } else {
                service = await Service.findOne({
                    _id: serviceId,
                    isActive: true,
                    $or: [{
                        isSpecialService: false,
                        allowedProgrammes: { $in: [user.userInfo.user_programme, '*'] },
                        allowedBatches: { $in: [user.userInfo.user_batch, '*'] },
                        allowedUserTypes: { $in: [user.userInfo.user_type, '*'] },
                        allowedUserStatus: { $in: [user.userInfo.user_status, '*'] }
                    }, {
                        isSpecialService: true,
                        specialServiceUsers: daiictId
                    }]
                })
                    .populate({
                        path: 'collectionTypes',
                        select: readCollectionTypePermission.attributes
                    })
                    .populate({
                        path: 'availableParameters',
                        select: readParameterPermission.attributes
                    });

                if (!service) {
                    return res.sendStatus(HttpStatus.NOT_FOUND);
                }
                // Allowing only those parameters which are active
                service.availableParameters = filterActiveData(service.availableParameters);
                service.collectionTypes = filterActiveData(service.collectionTypes);
            }

            if (service) {
                const filteredService = filterResourceData(service, readPermission.attributes);
                const extraInfo = await getRequiredInfoForService(user);
                res.status(HttpStatus.OK)
                    .json({
                        service: filteredService,
                        extraInfo
                    });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }

        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    getExtraInfoForService: async (req, res, next) => {
        const { user } = req;

        const extraInfo = await getRequiredInfoForService(user);
        res.status(HttpStatus.OK)
            .json({
                extraInfo
            });
    },

    /* Further improvement
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

                    // Allowing only those parameters which are active
                    service.availableParameters = filterActiveData(service.availableParameters);
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

                    // Allowing only those parameters which are active
                    service.availableParameters = filterActiveData(service.availableParameters);
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

                // Allowing only those parameters which are active
                service.availableParameters = filterActiveData(service.availableParameters);
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
    */

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
            const newServiceAtt = req.value.body;
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

            const newService = req.value.body;

            const service = await Service.findByIdAndUpdate(serviceId, newService, { new: true })
                .populate({
                    path: 'collectionTypes',
                    select: readCollectionTypePermission.attributes
                })
                .populate({
                    path: 'availableParameters',
                    select: readParameterPermission.attributes
                });
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

            const service = await Service.findOneAndUpdate({
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
                });

            if (service) {
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
        const { daiictId } = user;
        const { serviceId } = req.params;

        const changeStatusPermission = accessControl.can(user.userType)
            .updateAny(resources.changeResourceStatus);
        const readPermission = accessControl.can(user.userType)
            .readAny(resources.service);

        if (changeStatusPermission.granted) {
            const serviceUpdateAtt = req.value.body;
            const updatedService = await Service.findByIdAndUpdate(serviceId, serviceUpdateAtt, { new: true });
            if (updatedService) {
                const filteredService = filterResourceData(updatedService, readPermission.attributes);
                await generateServiceChangeStatusMessage(filteredService, daiictId);

                res.status(HttpStatus.OK)
                    .json({ service: filteredService });
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

            await removeOrderWithDeletedService(serviceId);
            await deleteCurrServiceNews(serviceId);

            const service = await Service.findById(serviceId);
            const deletedService = await Service.findByIdAndRemove(serviceId);

            if (deletedService) {
                let message = StringFormatter(ADMIN_SERVICE_DELETED, [service.name, daiictId]);
                const notification = generateCustomNotification(allAdmin, systemAdmin, message);
                await notification.save();

                res.status(HttpStatus.OK)
                    .json({});
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }

        } else if (deleteOwnPermission.granted) {

            await removeOrderWithDeletedService(serviceId);
            await deleteCurrServiceNews(serviceId);

            const service = await Service.findById(serviceId);
            const deletedService = await Service.findOneAndRemove({
                _id: serviceId,
                createdBy: daiictId
            });

            if (deletedService) {
                let message = StringFormatter(ADMIN_SERVICE_DELETED, [service.name, daiictId]);
                const notification = generateCustomNotification(allAdmin, systemAdmin, message);
                await notification.save();

                res.status(HttpStatus.OK)
                    .json({});
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }

        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },
};
