const httpStatusCodes = require('http-status-codes');

const Service = require('../models/service');
const Order = require('../models/order');
const PlacedOrder = require('../models/placedOrder');
const Cart = require('../models/cart');
const PlacedCart = require('../models/placedCart');
const Delivery = require('../models/delivery');
const Collector = require('../models/collector');
const Parameter = require('../models/parameter');

const { filterResourceData, parseSortQuery, parseFilterQuery, convertToStringArray } = require('../helpers/controllerHelpers');
const { accessControl } = require('./access');
const { resources, sortQueryName, orderStatus, cartStatus, collectionTypes } = require('../configuration');
const errorMessages = require('../configuration/errors');
const { generateOrderStatusChangeNotification } = require('../helpers/notificationHelper');


/*return -1 when invalid*/
const calculateServiceCost = async (service, requiredUnits, user) => {

    const specialServiceValidation = !service.isSpecialService || service.specialServiceUsers.includes(user.daiictId);
    //const useServiceValidation = (!user.userInfo.user_batch || service.allowedBatches.includes(user.userInfo.user_batch)) &&
    //  (!user.userInfo.user_programme || service.allowedProgrammes.includes(user.userInfo.user_programme));
    const useServiceValidation = true;
    if (!specialServiceValidation || !useServiceValidation || !service.isActive || requiredUnits > service.maxUnits || requiredUnits <= 0) {
        return -1;
    }

    return requiredUnits * service.baseCharge;
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

const recalculateOrderCost = async (order, user) => {
    const service = await Service.findById(order.service);

    order.parameterCost = await calculateParameterCost(order.parameters, order.unitsRequested);
    order.serviceCost = await calculateServiceCost(service, order.unitsRequested, user);
    order.totalCost = 0;

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

const validateOrder = async (orders, user) => {

    if (orders instanceof Array) {
        let newOrders = [];

        for (let i = 0; i < orders.length; i++) {

            if (orders[i].status === orderStatus.unplaced || orders[i].status === orderStatus.invalidOrder) {
                newOrders.push(await recalculateOrderCost(orders[i], user));
            } else {
                newOrders.push(orders[i]);
            }
        }

        return newOrders;
    } else if (orders !== undefined) {
        let newOrder = {};

        if (orders.status === orderStatus.unplaced || orders.status === orderStatus.invalidOrder) {
            newOrder = await recalculateOrderCost(orders, user);
        } else {
            newOrder = orders;
        }

        return newOrder;
    } else {
        return orders;
    }
};

const validateAddedOrder = async (cartId, service, unitsRequested) => {
    const cart = await Cart.findById(cartId)
        .deepPopulate(['orders.service', 'orders.parameters', 'delivery', 'pickup']);
    const { orders } = cart;
    let count = unitsRequested;
    for (let i = 0; i < orders.length; i++) {
        if (orders[i].service._id.toString() === service._id.toString()) {
            count++;
        }
    }
    return count <= service.maxUnits;
};

const getOrders = async (user, query, readableAttributes, parameterReadableAtt, sortQuery) => {
    const orders = await Order.find(query)
        .sort(sortQuery)
        .populate({
            path: 'parameters',
            select: parameterReadableAtt
        });

    const validatedOrder = await validateOrder(orders, user);
    return filterResourceData(validatedOrder, readableAttributes);
};

module.exports = {
    orderStatus,

    validateOrder,

    getAllOrders: async (req, res, next) => {

        const { user } = req;
        const { daiictId } = user;

        const readAnyPermission = accessControl.can(user.userType)
            .readAny(resources.order);
        const readOwnPermission = accessControl.can(user.userType)
            .readOwn(resources.order);
        const readAnyParameterPermission = accessControl.can(user.userType)
            .readAny(resources.parameter);

        const query = parseFilterQuery(req.query, readOwnPermission.attributes);
        const sortQuery = parseSortQuery(req.query[sortQueryName], readOwnPermission.attributes);
        let orderAttributes = {};

        if (readAnyPermission.granted) {
            orderAttributes = readAnyPermission.attributes;

            if (query.status !== undefined) {
                if (query.status < orderStatus.placed) {
                    query.status = -1;
                }
            } else {
                query.status = {
                    $gte: orderStatus.placed
                };
            }

        } else if (readOwnPermission.granted) {
            orderAttributes = readOwnPermission.attributes;
            query.requestedBy = daiictId;
        } else {
            return res.sendStatus(httpStatusCodes.FORBIDDEN);
        }

        const filteredOrders = await getOrders(user, query, orderAttributes, readAnyParameterPermission.attributes, sortQuery);
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
        const readAnyParameterPermission = accessControl.can(user.userType)
            .readAny(resources.parameter);

        const query = {
            _id: orderId
        };

        let orderAttributes = {};

        if (readAnyPermission.granted) {
            orderAttributes = readAnyPermission.attributes;
        } else if (readOwnPermission.granted) {
            orderAttributes = readOwnPermission.attributes;
            query.requestedBy = daiictId;
        } else {
            return res.sendStatus(httpStatusCodes.FORBIDDEN);
        }

        const filteredOrders = await getOrders(user, query, orderAttributes, readAnyParameterPermission.attributes);
        res.status(httpStatusCodes.OK)
            .json({ order: filteredOrders });
    },

    addOrder: async (req, res, next) => {
        const { user } = req;
        const { daiictId, cartId } = user;
        const timeStamp = new Date();

        const createOwnPermission = accessControl.can(user.userType)
            .createOwn(resources.order);
        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        if (createOwnPermission.granted) {
            let orderAtt = req.value.body.order;
            const newOrder = new Order(orderAtt);

            newOrder.requestedBy = daiictId;
            newOrder.createdOn = timeStamp;
            newOrder.status = orderStatus.unplaced;

            const service = await Service.findById(newOrder.service);
            newOrder.serviceName = service.name;

            const serviceCost = await calculateServiceCost(service, newOrder.unitsRequested, user);

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
            newOrder.cartId = cartId;

            if (!(await validateAddedOrder(cartId, service, newOrder.unitsRequested))) {
                res.status(httpStatusCodes.PRECONDITION_FAILED)
                    .send('Orders of ' + service.name + ' exceeds maximum allowed units');
                return;
            }
            const order = await newOrder.save();

            await Cart.findByIdAndUpdate(cartId, {
                '$push': {
                    'orders': order._id
                }
            });

            const filteredOrder = filterResourceData(order, readOwnOrderPermission.attributes);
            res.status(httpStatusCodes.CREATED)
                .json({
                    order: filteredOrder
                });
        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    deleteOrder: async (req, res, next) => {
        const { user } = req;
        const { daiictId, cartId } = user;
        const { orderId } = req.params;

        const deleteOwnPermission = accessControl.can(user.userType)
            .deleteOwn(resources.order);

        if (deleteOwnPermission.granted) {
            const order = await Order.findById(orderId);

            if ((order.status === orderStatus.unplaced || order.status === orderStatus.invalidOrder) && order.requestedBy === daiictId) {
                await Order.findByIdAndRemove(orderId);

                await Cart.findByIdAndUpdate(cartId, {
                    'pull': {
                        'orders': order._id
                    }
                });
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

        const readOwnPermission = accessControl.can(user.userType)
            .readOwn(resources.order);
        const readAnyParameterPermission = accessControl.can(user.userType)
            .readAny(resources.parameter);
        const updateOwnPermission = accessControl.can(user.userType)
            .updateOwn(resources.order);

        if (updateOwnPermission.granted) {
            const updatedOrder = req.value.body;

            const orderInDB = await Order.findOne({
                _id: orderId,
                requestedBy: daiictId
            });
            if (orderInDB) {
                if (orderInDB.status === orderStatus.onHold) {

                    const order = await Order.findOneAndUpdate({
                        _id: orderId,
                        requestedBy: daiictId
                    }, {
                        status: orderStatus.processing,
                        comment: updatedOrder.comment,
                        lastModifiedBy: daiictId,
                        lastModified: new Date()
                    }, { new: true })
                        .populate({
                            path: 'parameters',
                            select: readAnyParameterPermission.attributes
                        });

                    if (order) {
                        const filteredOrder = filterResourceData(order, readOwnPermission.attributes);
                        res.status(httpStatusCodes.OK)
                            .json({ order: filteredOrder });
                    } else {
                        res.sendStatus(httpStatusCodes.NOT_FOUND);
                    }
                }
                else if (orderInDB.status === orderStatus.unplaced || orderInDB.status === orderStatus.invalidOrder) {

                    if (updatedOrder.unitsRequested !== undefined) {
                        const service = await Service.findById(orderInDB.service);
                        const serviceCost = await calculateServiceCost(service, updatedOrder.unitsRequested);

                        if (serviceCost === -1) {
                            res.status(httpStatusCodes.PRECONDITION_FAILED)
                                .send(errorMessages.invalidService);
                            return;
                        }
                        updatedOrder.serviceCost = serviceCost;
                    }

                    if (updatedOrder.parameters !== undefined) {
                        const service = await Service.findById(orderInDB.service);
                        const parameterCost = await calculateParameterCost(updatedOrder.parameters, orderInDB.unitsRequested, service.availableParameters);

                        if (parameterCost === -1) {
                            return res.status(httpStatusCodes.PRECONDITION_FAILED)
                                .send(errorMessages.invalidParameter);
                        }

                        updatedOrder.parameterCost = parameterCost;
                    }

                    const order = await Order.findOneAndUpdate({
                        _id: orderId,
                        requestedBy: daiictId
                    }, updatedOrder, { new: true })
                        .populate({
                            path: 'parameters',
                            select: readAnyParameterPermission.attributes
                        });

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

            let updateAtt = {
                lastModifiedBy: daiictId,
                lastModified: new Date()
            };

            const holdOrder = orderUpdateAtt.status === orderStatus.onHold && orderInDb.status > orderStatus.placed && orderInDb.status < orderStatus.completed;

            if (!holdOrder && orderInDb.status !== orderStatus.processing) {
                return res.status(httpStatusCodes.BAD_REQUEST)
                    .send(errorMessages.invalidStatusChange);
            }


            switch (orderUpdateAtt.status) {
                case orderStatus.ready:
                    updateAtt.status = orderStatus.ready;
                    break;
                case orderStatus.onHold:
                    updateAtt.status = orderStatus.onHold;
                    updateAtt.holdReason = orderUpdateAtt.reason;
                    /*generate notification for hold order*/
                    break;
                default :
                    return res.sendStatus(httpStatusCodes.BAD_REQUEST);
            }

            const updatedOrder = await Order.findByIdAndUpdate(orderId, updateAtt, { new: true });

            const readCollectionTypePermission = accessControl.can(user.userType)
                .readAny(resources.collectionType);

            const cart = await Cart.findById(orderInDb.cartId)
                .populate({
                    'orders': {
                        select: 'status'
                    },
                    'collectionType': {
                        select: readCollectionTypePermission.attributes
                    }
                });

            let allReady = true;
            for (let i = 0; i < cart.orders.length; i++) {
                if (cart.orders[i].status !== orderStatus.ready && cart.orders[i].status !== orderStatus.cancelled) {
                    allReady = false;
                }
            }

            if (allReady) {
                if (cart.collectionType.category === collectionTypes.delivery) {
                    cart.status = cartStatus.readyToDeliver;
                } else {
                    cart.status = cartStatus.readyToPickup;
                }
            }
            await cart.save();


            if (updatedOrder) {
                const notification = generateOrderStatusChangeNotification(orderInDb.requestedBy, daiictId, orderInDb.serviceName, updateAtt.status);
                await notification.save();

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

    cancelOrder: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { orderId } = req.params;

        const changeStatusPermission = accessControl.can(user.userType)
            .updateAny(resources.changeResourceStatus);

        if (changeStatusPermission.granted) {
            const updatedOrder = req.value.body;
            updatedOrder.lastModified = new Date();
            updatedOrder.lastModifiedBy = daiictId;
            updatedOrder.status = orderStatus.cancelled;

            const orderInDB = await Order.findById(orderId);
            if (orderInDB) {

                if (orderInDB.status >= orderStatus.placed && orderInDB.status < orderStatus.completed) {

                    const order = await Order.findByIdAndUpdate(orderId, updatedOrder);
                    const placedOrder = await PlacedOrder.findOneAndUpdate({ orderId: order._id }, {
                        status: orderStatus.failed,
                        cancelReason: updatedOrder.cancelReason
                    });

                    const cart = await Cart.findById(orderInDB.cartId)
                        .populate({
                            path: 'orders',
                            select: 'status'
                        });

                    let allReady = true;
                    let allCancel = true;
                    for (let i = 0; i < cart.orders.length; i++) {
                        if (cart.orders[i].status !== orderStatus.ready && cart.orders[i].status !== orderStatus.cancelled) {
                            allReady = false;
                        }
                        if (cart.orders[i].status !== orderStatus.cancelled) {
                            allCancel = false;
                        }
                    }

                    if (allReady) {
                        if (cart.collectionType = collectionTypes.delivery) {
                            cart.status = cartStatus.readyToDeliver;
                        } else {
                            cart.status = cartStatus.readyToPickup;
                        }
                    }

                    if (allCancel) {
                        await Cart.findByIdAndUpdate(cartId, {
                            status: cartStatus.cancelled,
                            cancelReason: 'All orders cancelled'
                        });
                        await PlacedCart.findOneAndUpdate({ cartId }, {
                            status: cartStatus.cancelled,
                            cancelReason: 'All orders cancelled'
                        });

                        if (cart.collectionTypeCategory === collectionTypes.delivery) {
                            await Delivery.findByIdAndUpdate(cart.delivery, { status: collectionStatus.cancel });
                        } else if (cart.collectionTypeCategory === collectionTypes.pickup) {
                            await Collector.findByIdAndUpdate(cart.pickup, { status: collectionStatus.cancel });
                        }
                    }
                    await cart.save();

                    res.sendStatus(httpStatusCodes.OK);
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
};
