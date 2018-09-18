const httpStatusCodes = require('http-status-codes');
const Service = require('../models/service');
const Courier = require('../models/courier');
const Collector = require('../models/collector');
const Order = require('../models/order');
const CollectionType = require('../models/collectionType');
const Parameter = require('../models/parameter');

const { filterResourceData, parseSortQuery, parseFilterQuery, convertToStringArray } = require('../helpers/controllerHelpers');
const { accessControl } = require('./access');
const { resources, collectionTypes, sortQueryName, paymentTypes } = require('../configuration');
const errorMessages = require('../configuration/errors');

const orderStatus = {
    failed: 0,
    invalidOrder: 10,
    paymentIncomplete: 20,
    placed: 30,
    processingOrder: 40,
    processingDelivery: 50,
    readyToDeliver: 60,
    delivered: 70,
    readyToPickup: 80,
    onHold: 90,
    cancelled: 100,
    refunded: 110,
};

/*return -1 when invalid*/
const calculateServiceCost = async (service, requiredUnits) => {

    if (!service.isActive || requiredUnits > service.maxUnits) {
        return -1;
    }

    return requiredUnits * service.baseCharge;
};

/*return -1 when invalid*/
const calculateCollectionTypeCost = async (collectionType, requiredUnits) => {
    const collectionTypeDoc = await CollectionType.findOne({ name: collectionType });

    if (!collectionTypeDoc.isActive) {
        return -1;
    }

    return collectionTypeDoc.baseCharge;
};

/*return -1 when invalid*/
const calculateParameterCost = async (parameters, requiredUnits, availableParameters) => {

    let totalCost = 0;

    if (availableParameters) {
        availableParameters = convertToStringArray(availableParameters);
        for (let i = 0; i < parameters.length; i++) {
            let parameterId;
            if (parameters[i]._id) {
                parameterId = parameters[i]._id;
            } else {
                parameterId = parameters[i];
            }

            const parameter = await Parameter.findById(parameterId);
            if (!parameter.isActive || !availableParameters.includes(parameterId.toString())) {
                return -1;
            }

            totalCost += parameter.baseCharge;
        }
    } else {
        for (let i = 0; i < parameters.length; i++) {
            let parameterId;
            if (parameters[i]._id) {
                parameterId = parameters[i]._id;
            } else {
                parameterId = parameters[i];
            }
            const parameter = await Parameter.findById(parameterId);
            if (!parameter.isActive) {
                return -1;
            }

            totalCost += parameter.baseCharge;
        }
    }

    return totalCost * requiredUnits;
};

const recalculateOrderCost = async (order) => {
    const service = await Service.findById(order.serviceId);

    if (order.courier) {
        order.collectionTypeCost = await calculateCollectionTypeCost(collectionTypes.courier, order.unitsRequested);
    } else if (order.pickup) {
        order.collectionTypeCost = await calculateCollectionTypeCost(collectionTypes.pickup, order.unitsRequested);
    } else {
        order.collectionTypeCost = 0;
    }

    order.parameterCost = await calculateParameterCost(order.parameters, order.unitsRequested);
    order.serviceCost = await calculateServiceCost(service, order.unitsRequested);
    order.totalCost = 0;

    if (order.collectionTypeCost === -1) {
        order.status = orderStatus.invalidOrder;
        order.validityErrors.push(errorMessages.invalidCollectionType);
    } else {
        order.totalCost += order.collectionTypeCost;
    }

    if (order.parameterCost === -1) {
        order.status = orderStatus.invalidOrder;
        order.validityErrors.push(errorMessages.invalidParameter);
    } else {
        order.totalCost += order.parameterCost;
    }

    if (order.serviceCost === -1) {
        order.status = orderStatus.invalidOrder;
        order.validityErrors.push(errorMessages.invalidService);
    } else {
        order.totalCost += order.serviceCost;
    }
    return order;
};

const validateOrder = async (orders) => {

    if (orders instanceof Array) {
        let newOrders = [];

        for (let i = 0; i < orders.length; i++) {

            if (orders[i].status < orderStatus.placed) {
                newOrders.push(await recalculateOrderCost(orders[i]));
            } else {
                newOrders.push(orders[i]);
            }
        }

        return newOrders;
    } else if (orders !== undefined) {
        let newOrder = {};

        if (orders.status < orderStatus.placed) {
            newOrder = await recalculateOrderCost(orders);
        } else {
            newOrder = orders;
        }

        return newOrder;
    } else {
        return orders;
    }
};

const getOrders = async (query, readableAttributes, sortQuery) => {
    const orders = await Order.find(query)
        .sort(sortQuery)
        .populate({ path: 'parameters' })
        .populate({ path: 'courier' })
        .populate({ path: 'pickup' });

    const validatedOrder = await validateOrder(orders);
    return filterResourceData(validatedOrder, readableAttributes);
};

module.exports = {
    getAllOrders: async (req, res, next) => {

        const { user } = req;
        const { daiictId } = user;

        const readAnyPermission = accessControl.can(user.userType)
            .readAny(resources.order);
        const readOwnPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        const query = parseFilterQuery(req.query, readOwnPermission.attributes);
        const sortQuery = parseSortQuery(req.query[sortQueryName], readOwnPermission.attributes);

        if (readAnyPermission.granted) {

        } else if (readOwnPermission.granted) {
            query.requestedBy = daiictId;
        } else {
            return res.sendStatus(httpStatusCodes.FORBIDDEN);
        }

        const filteredOrders = await getOrders(query, readOwnPermission.attributes, sortQuery);
        res.status(httpStatusCodes.OK)
            .json({ order: filteredOrders });
    },

    getOrder: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { orderId } = req.params;

        const readAnyPermission = accessControl.can(user.userType)
            .readAny(resources.order);
        const readOwnPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        const query = {
            _id: orderId
        };

        if (readAnyPermission.granted) {

        } else if (readOwnPermission.granted) {
            query.requestedBy = daiictId;
        } else {
            return res.sendStatus(httpStatusCodes.FORBIDDEN);
        }

        const filteredOrders = await getOrders(query, readOwnPermission.attributes);
        res.status(httpStatusCodes.OK)
            .json({ order: filteredOrders });
    },

    addOrder: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const timeStamp = new Date();

        const createOwnPermission = accessControl.can(user.userType)
            .createOwn(resources.order);
        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);
        const readOwnCourierPermission = accessControl.can(user.userType)
            .readOwn(resources.courier);
        const readOwnCollectorPermission = accessControl.can(user.userType)
            .readOwn(resources.collector);

        if (createOwnPermission.granted) {
            let orderAtt = req.value.body.order;
            /* handle unknown parameter type*/
            const newOrder = new Order(orderAtt);

            newOrder.requestedBy = daiictId;
            newOrder.createdOn = timeStamp;
            newOrder.status = newOrder.isPaymentDone ? orderStatus.placed : orderStatus.paymentIncomplete;

            const service = await Service.findById(newOrder.serviceId);
            newOrder.serviceName = service.name;

            const serviceCost = await calculateServiceCost(service, newOrder.unitsRequested);

            if (serviceCost === -1) {
                res.status(httpStatusCodes.PRECONDITION_FAILED)
                    .send(errorMessages.invalidService);
                return;
            }
            newOrder.serviceCost = serviceCost;

            const parameterCost = await calculateParameterCost(newOrder.parameters, newOrder.unitsRequested, service.availableParameters);
            if (parameterCost === -1) {
                res.status(httpStatusCodes.PRECONDITION_FAILED)
                    .send(errorMessages.invalidParameter);
                return;
            }
            newOrder.parameterCost = parameterCost;

            if (req.body.courier) {
                const newCourier = new Courier(req.body.courier);
                newCourier.orderId = newOrder._id;
                newCourier.createdOn = timeStamp;
                newCourier.createdBy = daiictId;

                newOrder.collectionType = collectionTypes.courier;
                newOrder.courier = newCourier._id;

                const collectionTypeCost = await calculateCollectionTypeCost(collectionTypes.courier, newOrder.unitsRequested);
                if (collectionTypeCost === -1) {
                    res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCollectionType);
                    return;
                }
                newOrder.collectionTypeCost = collectionTypeCost;

                const courier = await newCourier.save();
                const order = await newOrder.save();

                const filteredOrder = filterResourceData(order, readOwnOrderPermission.attributes);
                const filteredCourier = filterResourceData(courier, readOwnCourierPermission.attributes);

                res.status(httpStatusCodes.CREATED)
                    .json({
                        order: filteredOrder,
                        courier: filteredCourier
                    });

            } else if (req.body.pickup) {
                const newCollector = new Collector(req.body.pickup);
                newCollector.orderId = newOrder._id;
                newCollector.createdOn = timeStamp;
                newCollector.createdBy = daiictId;

                newOrder.collectionType = collectionTypes.pickup;
                newOrder.pickup = newCollector._id;

                const collectionTypeCost = await calculateCollectionTypeCost(collectionTypes.pickup, newOrder.unitsRequested);
                if (collectionTypeCost === -1) {
                    res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCollectionType);
                    return;
                }
                newOrder.collectionTypeCost = collectionTypeCost;

                const collector = await newCollector.save();
                const order = await newOrder.save();

                const filteredOrder = filterResourceData(order, readOwnOrderPermission.attributes);
                const filteredCollector = filterResourceData(collector, readOwnCollectorPermission.attributes);

                res.status(httpStatusCodes.CREATED)
                    .json({
                        order: filteredOrder,
                        collector: filteredCollector
                    });
            } else {
                const order = await newOrder.save();
                const filteredOrder = filterResourceData(order, readOwnOrderPermission.attributes);
                res.status(httpStatusCodes.CREATED)
                    .json({
                        order: filteredOrder
                    });
            }
        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    deleteOrder: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { orderId } = req.params;

        const deleteOwnPermission = accessControl.can(user.userType)
            .deleteOwn(resources.order);

        if (deleteOwnPermission.granted) {
            const order = await Order.findById(orderId);

            if (order.status < orderStatus.placed && order.requestedBy === daiictId) {
                await Order.findByIdAndRemove(orderId);
                res.sendStatus(httpStatusCodes.OK);
            } else {
                res.sendStatus(httpStatusCodes.FORBIDDEN);
            }
        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    updateOrder: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { orderId } = req.params;

        const readAnyPermission = accessControl.can(user.userType)
            .readAny(resources.order);
        const readOwnPermission = accessControl.can(user.userType)
            .readOwn(resources.order);
        const updateAnyPermission = accessControl.can(user.userType)
            .updateAny(resources.order);
        const updateOwnPermission = accessControl.can(user.userType)
            .updateOwn(resources.order);

        if (updateAnyPermission.granted) {
            const updatedOrder = req.value.body;
            const orderInDB = await Order.findById(orderId);
            if (orderInDB.status < orderStatus.placed) {

                if (updatedOrder.unitsRequested !== undefined) {
                    const service = await Service.findById(orderInDB.serviceId);
                    const serviceCost = await calculateServiceCost(service, updatedOrder.unitsRequested);

                    if (serviceCost === -1) {
                        res.status(httpStatusCodes.PRECONDITION_FAILED)
                            .send(errorMessages.invalidService);
                        return;
                    }
                    updatedOrder.serviceCost = serviceCost;
                }

                /* handle unknown payment type*/
                const order = await Order.findByIdAndUpdate(orderId, updatedOrder);

                if (order) {
                    const filteredOrder = filterResourceData(order, readAnyPermission.attributes);
                    res.status(httpStatusCodes.OK)
                        .json({ order: filteredOrder });
                } else {
                    res.sendStatus(httpStatusCodes.NOT_FOUND);
                }
            } else {
                res.sendStatus(httpStatusCodes.FORBIDDEN);
            }


        } else if (updateOwnPermission.granted) {
            const updatedOrder = req.value.body;

            const orderInDB = await Order.findOne({
                _id: orderId,
                requestedBy: daiictId
            });
            if (orderInDB) {

                if (orderInDB.status < orderStatus.placed) {

                    if (updatedOrder.unitsRequested !== undefined) {
                        const service = await Service.findById(orderInDB.serviceId);
                        const serviceCost = await calculateServiceCost(service, updatedOrder.unitsRequested);

                        if (serviceCost === -1) {
                            res.status(httpStatusCodes.PRECONDITION_FAILED)
                                .send(errorMessages.invalidService);
                            return;
                        }
                        updatedOrder.serviceCost = serviceCost;
                    }
                    /* handle unknown payment type*/
                    const order = await Order.updateOne({
                        _id: orderId,
                        requestedBy: daiictId
                    }, updatedOrder);

                    if (order) {
                        const filteredOrder = filterResourceData(order, readOwnPermission.attributes);
                        res.status(httpStatusCodes.OK)
                            .json({ order: filteredOrder });
                    } else {
                        res.sendStatus(httpStatusCodes.NOT_FOUND);
                    }
                } else {
                    res.sendStatus(httpStatusCodes.FORBIDDEN);
                }

            } else {
                res.sendStatus(httpStatusCodes.NOT_FOUND);
            }

        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    updateParameter: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { orderId } = req.params;

        const readOwnPermission = accessControl.can(user.userType)
            .readOwn(resources.order);
        const updateOwnPermission = accessControl.can(user.userType)
            .updateOwn(resources.order);

        if (updateOwnPermission.granted) {
            const parameters = req.value.body.parameters;

            const order = await Order.findOne({
                _id: orderId,
                requestedBy: daiictId
            });

            if (!order) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            } else if (order.status < orderStatus.placed) {

                const service = await Service.findById(order.serviceId);
                const cost = await calculateParameterCost(parameters, order.unitsRequested, service.availableParameters);

                if (cost === -1) {
                    return res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidParameter);
                }

                order.parameterCost = cost;
                order.parameters = parameters;

                const newOrder = await order.save();

                const filteredOrder = filterResourceData(newOrder, readOwnPermission.attributes);
                res.status(httpStatusCodes.OK)
                    .json({ order: filteredOrder });

            } else {
                return res.sendStatus(httpStatusCodes.FORBIDDEN);
            }
        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    addCourier: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { orderId } = req.params;
        const timeStamp = new Date();

        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);
        const readOwnCourierPermission = accessControl.can(user.userType)
            .readOwn(resources.courier);
        const updateOwnPermission = accessControl.can(user.userType)
            .updateOwn(resources.order);

        if (updateOwnPermission.granted) {
            const courier = new Courier(req.value.body);
            courier.createdOn = timeStamp;
            courier.createdBy = daiictId;

            const order = await Order.findOne({
                _id: orderId,
                requestedBy: daiictId
            });

            if (!order) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            } else if (order.status < orderStatus.placed) {

                const cost = await calculateCollectionTypeCost(collectionTypes.courier);
                if (cost === -1) {
                    res.sendStatus(httpStatusCodes.PRECONDITION_FAILED);
                    return;
                }

                order.collectionTypeCost = cost;

                order.pickup = undefined;

                order.collectionType = collectionTypes.courier;
                order.courier = courier._id;
                courier.orderId = order._id;
                console.log(order);
                const newCourier = await courier.save();
                const newOrder = await order.save();

                const filteredCourier = filterResourceData(newCourier, readOwnCourierPermission.attributes);
                const filteredOrder = filterResourceData(newOrder, readOwnOrderPermission.attributes);
                res.status(httpStatusCodes.CREATED)
                    .json({
                        order: filteredOrder,
                        courier: filteredCourier
                    });

            } else {
                return res.sendStatus(httpStatusCodes.FORBIDDEN);
            }

        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    updateCourier: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { orderId } = req.params;

        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);
        const readOwnCourierPermission = accessControl.can(user.userType)
            .readOwn(resources.courier);
        const updateOwnPermission = accessControl.can(user.userType)
            .updateOwn(resources.order);

        if (updateOwnPermission.granted) {
            const courier = req.value.body;

            const order = await Order.findOne({
                _id: orderId,
                requestedBy: daiictId
            });

            if (!order || !order.courier) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            } else if (order.status < orderStatus.placed) {

                const cost = await calculateCollectionTypeCost(collectionTypes.courier);
                if (cost === -1) {
                    res.sendStatus(httpStatusCodes.PRECONDITION_FAILED);
                    return;
                }
                console.log(order.courier);
                const newCourier = await Courier.findByIdAndUpdate(order.courier, courier, { new: true });
                /* check if courier is present*/
                const newOrder = await order.save();

                const filteredCourier = filterResourceData(newCourier, readOwnCourierPermission.attributes);
                const filteredOrder = filterResourceData(newOrder, readOwnOrderPermission.attributes);
                res.status(httpStatusCodes.OK)
                    .json({
                        order: filteredOrder,
                        courier: filteredCourier
                    });

            } else {
                res.sendStatus(httpStatusCodes.FORBIDDEN);
            }


        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    addPickup: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { orderId } = req.params;

        const timeStamp = new Date();

        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);
        const readOwnPickupPermission = accessControl.can(user.userType)
            .readOwn(resources.collector);
        const updateOwnPermission = accessControl.can(user.userType)
            .updateOwn(resources.order);

        if (updateOwnPermission.granted) {
            const pickup = new Collector(req.value.body);
            pickup.createdOn = timeStamp;
            pickup.createdBy = daiictId;

            const cost = await calculateCollectionTypeCost(collectionTypes.pickup);
            const order = await Order.findOne({
                _id: orderId,
                requestedBy: daiictId
            });

            if (!order) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            } else if (order.status < orderStatus.placed) {
                order.collectionTypeCost = cost;
                order.courier = undefined;

                order.collectionType = collectionTypes.pickup;
                order.pickup = pickup._id;
                pickup.orderId = order._id;
                const newPickup = await pickup.save();
                const newOrder = await order.save();

                const filteredPickup = filterResourceData(newPickup, readOwnPickupPermission.attributes);
                const filteredOrder = filterResourceData(newOrder, readOwnOrderPermission.attributes);
                res.status(httpStatusCodes.CREATED)
                    .json({
                        order: filteredOrder,
                        pickup: filteredPickup
                    });
            } else {
                return res.sendStatus(httpStatusCodes.FORBIDDEN);
            }


        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    updatePickup: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { orderId } = req.params;

        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);
        const readOwnPickupPermission = accessControl.can(user.userType)
            .readOwn(resources.collector);
        const updateOwnPermission = accessControl.can(user.userType)
            .updateOwn(resources.order);

        if (updateOwnPermission.granted) {
            const pickup = req.value.body;

            const order = await Order.findOne({
                _id: orderId,
                requestedBy: daiictId
            });


            if (!order || !order.pickup) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            } else if (order.status < orderStatus.placed) {

                const newPickup = await Collector.findByIdAndUpdate(order.pickup, pickup, { new: true });
                const newOrder = await order.save();

                const filteredPickup = filterResourceData(newPickup, readOwnPickupPermission.attributes);
                const filteredOrder = filterResourceData(newOrder, readOwnOrderPermission.attributes);
                res.status(httpStatusCodes.OK)
                    .json({
                        order: filteredOrder,
                        pickup: filteredPickup
                    });

            } else {
                return res.sendStatus(httpStatusCodes.FORBIDDEN);
            }
        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    addPayment: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { orderId } = req.params;
        const updateOwnPermission = accessControl.can(user.userType)
            .updateOwn(resources.order);
        const readPermission = accessControl.can(user.userType)
            .readAny(resources.order);

        if (updateOwnPermission.granted) {

            const orderUpdateAtt = req.value.body;
            orderUpdateAtt.status = orderStatus.placed;
            orderUpdateAtt.lastModifiedBy = daiictId;
            orderUpdateAtt.lastModified = new Date();
            orderUpdateAtt.isPaymentDone = true;

            const orderInDb = await Order.findById(orderId);

            if (orderInDb){
                if (orderInDb.status===orderStatus.paymentIncomplete){
                    const updatedOrder = await Order.findByIdAndUpdate(orderId, orderUpdateAtt, { new: true });
                    const filteredOrder = filterResourceData(updatedOrder, readPermission.attributes);
                    res.status(httpStatusCodes.OK)
                        .json({ order: filteredOrder });
                } else {
                    res.sendStatus(httpStatusCodes.BAD_REQUEST);
                }
            } else {
                res.sendStatus(httpStatusCodes.NOT_FOUND);
            }
        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    changeStatus: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { orderId } = req.params;
        const changeStatusPermission = accessControl.can(user.userType)
            .updateAny(resources.changeResourceStatus);
        const readPermission = accessControl.can(user.userType)
            .readAny(resources.order);

        if (changeStatusPermission.granted) {

            const orderUpdateAtt = req.value.body;

            const orderInDb = await Order.findById(orderId);

            if (orderUpdateAtt.status - orderInDb.status > 10) {
                return res.status(httpStatusCodes.BAD_REQUEST)
                    .send(errorMessages.invalidStatusChange);
            }

            let updateAtt = {
                lastModifiedBy: daiictId,
                lastModified: new Date()
            };
            switch (orderUpdateAtt.status) {
                case orderStatus.processingOrder:
                    updateAtt.status = orderStatus.processingOrder;
                    break;
                case orderStatus.processingDelivery:
                    updateAtt.status = orderStatus.processingDelivery;
                    break;
                case orderStatus.readyToDeliver:
                    if (orderUpdateAtt.courierServiceName === undefined || orderUpdateAtt.trackingId === undefined) {
                        return res.status(httpStatusCodes.BAD_REQUEST)
                            .send(errorMessages.courierInformationRequired);
                    }
                    updateAtt.status = orderStatus.readyToDeliver;
                    const updatedCourier = await Courier.findByIdAndUpdate(orderInDb.courier, {
                        courierServiceName: orderUpdateAtt.courierServiceName,
                        trackingId: orderUpdateAtt.trackingId
                    });

                    if (!updatedCourier) {
                        return res.sendStatus(httpStatusCodes.NOT_FOUND);
                    }
                    break;
                case orderStatus.readyToPickup:
                    updateAtt.status=orderStatus.readyToPickup;
                    break;
            }
            const updatedOrder = await Order.findByIdAndUpdate(orderId, updateAtt, { new: true });
            if (updatedOrder) {
                const filteredOrder = filterResourceData(updatedOrder, readPermission.attributes);
                res.status(httpStatusCodes.OK)
                    .json({ order: filteredOrder });
            } else {
                res.sendStatus(httpStatusCodes.NOT_FOUND);
            }
        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },
};
