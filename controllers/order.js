const httpStatusCodes = require('http-status-codes');

const Service = require('../models/service');
const Courier = require('../models/courier');
const Collector = require('../models/collector');
const Order = require('../models/order');
const CollectionType = require('../models/collectionType');
const Parameter = require('../models/parameter');

const { filterResourceData } = require('../helpers/controllerHelpers');
const { accessControl } = require('./access');
const { resources, collectionTypes } = require('../configuration');

const orderStatus = {
    paymentRemaining: 0,
    pending: 1,
    processing: 2,
    completed: 3,
    processingDelivery: 4,
    readyToDeliver: 5,
    delivered: 6,
    onHold: 7,
    cancelled: 8,
    failed: 9,
    refunded: 10,
};

const serviceCost = async (serviceId) => {
    const cost = await Service.findById(serviceId, {
        baseCharge: 1,
        _id: 0
    });
    return cost.baseCharge;
};

const collectionTypeCost = async (collectionType) => {
    const cost = await CollectionType.findOne({ name: collectionType }, {
        baseCharge: 1,
        _id: 0
    });
    return cost.baseCharge;
};

const parameterCost = async (parameters) => {

    let totalCost = 0;

    for (let i = 0; i < parameters.length; i++) {
        const cost = await Parameter.findById(parameters[i], {
            baseCharge: 1,
            _id: 0
        });
        totalCost += cost.baseCharge;
    }

    return totalCost;
};

module.exports = {
    getAllOrders: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;

        const readAnyPermission = accessControl.can(user.userType)
            .readAny(resources.order);
        const readOwnPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        if (readAnyPermission.granted) {
            const orders = await Order.find({});
            const filteredOrders = filterResourceData(orders, readAnyPermission.attributes);
            res.status(httpStatusCodes.OK)
                .json({ order: filteredOrders });
        } else if (readOwnPermission.granted) {
            const orders = await Order.find({ requestedBy: daiictId });

            const filteredOrders = filterResourceData(orders, readOwnPermission.attributes);
            res.status(httpStatusCodes.OK)
                .json({ order: filteredOrders });
        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    getOrder: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { orderId } = req.params;

        const readAnyPermission = accessControl.can(user.userType)
            .readAny(resources.order);
        const readOwnPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        if (readAnyPermission.granted) {
            const order = await Order.findById(orderId);

            if (order) {
                const filteredOrder = filterResourceData(order, readAnyPermission.attributes);
                res.status(httpStatusCodes.OK)
                    .json({ order: filteredOrder });
            } else {
                res.sendStatus(httpStatusCodes.NOT_ACCEPTABLE);
            }
        } else if (readOwnPermission.granted) {
            const order = await Order.find({
                _id: orderId,
                requestedBy: daiictId
            });

            if (order) {
                const filteredOrder = filterResourceData(order, readOwnPermission.attributes);
                res.status(httpStatusCodes.OK)
                    .json({ order: filteredOrder });
            } else {
                res.sendStatus(httpStatusCodes.NOT_ACCEPTABLE);
            }

        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
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
            const newOrder = new Order(req.body.order);

            newOrder.requestedBy = daiictId;
            newOrder.createdOn = timeStamp;
            newOrder.status = newOrder.payment.isPaymentDone ? orderStatus.paymentRemaining : orderStatus.pending;
            newOrder.serviceCost = await serviceCost(newOrder.serviceId);
            newOrder.parameterCost = await parameterCost(newOrder.parameters);

            if (req.body.courier) {
                const newCourier = new Courier(req.body.courier);
                newCourier.orderId = newOrder._id;
                newCourier.createdOn = timeStamp;
                newCourier.createdBy = daiictId;

                newOrder.collectionType = {
                    courier: newCourier._id
                };

                newOrder.collectionTypeCost = await collectionTypeCost(collectionTypes.courier);

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

                newOrder.collectionType = {
                    pickup: newOrder._id
                };

                newOrder.collectionTypeCost = await collectionTypeCost(collectionTypes.pickup);

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
                res.sendStatus(httpStatusCodes.BAD_REQUEST);
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
            const result = await Order.findOneAndDelete({
                _id: orderId,
                requestedBy: daiictId
            });

            if (result) {
                res.sendStatus(httpStatusCodes.ACCEPTED);
            } else {
                res.sendStatus(httpStatusCodes.NOT_ACCEPTABLE);
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
            const updatedOrder = filterResourceData(req.body.order, updateAnyPermission.attributes);
            updatedOrder.lastModified = new Date();
            updatedOrder.lastModifiedBy = daiictId;

            const order = await Order.findByIdAndUpdate(orderId, updatedOrder);

            if (order) {
                const filteredOrder = filterResourceData(order, readAnyPermission.attributes);
                res.status(httpStatusCodes.ACCEPTED)
                    .json({ order: filteredOrder });
            } else {
                res.sendStatus(httpStatusCodes.NOT_ACCEPTABLE);
            }

        } else if (updateOwnPermission.granted) {
            const updatedOrder = filterResourceData(req.body.order, updateOwnPermission.attributes);
            updatedOrder.lastModified = new Date();
            updatedOrder.lastModifiedBy = daiictId;

            const order = await Order.updateOne({
                _id: orderId,
                requestedBy: daiictId
            }, updatedOrder);

            if (order) {
                const filteredOrder = filterResourceData(order, readOwnPermission.attributes);
                res.status(httpStatusCodes.ACCEPTED)
                    .json({ order: filteredOrder });
            } else {
                res.sendStatus(httpStatusCodes.NOT_ACCEPTABLE);
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
            const parameters = req.body.parameters;
            const cost = await parameterCost(parameters);
            const order = await Order.findOne({
                _id: orderId,
                requestedBy: daiictId
            });

            if (!order) {
                return res.sendStatus(httpStatusCodes.NOT_ACCEPTABLE);
            }

            order.lastModifiedBy=daiictId;
            order.lastModified=new Date();
            order.parameterCost = cost;
            order.parameters = parameters;

            const newOrder = await order.save();

            const filteredOrder = filterResourceData(newOrder, readOwnPermission.attributes);
            res.status(httpStatusCodes.ACCEPTED)
                .json({ order: filteredOrder });
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
            const courier = new Courier(req.body.courier);
            courier.createdOn=timeStamp;
            courier.createdBy=daiictId;

            const cost = await collectionTypeCost(collectionTypes.courier);
            const order = await Order.findOne({
                _id: orderId,
                requestedBy: daiictId
            });

            if (!order) {
                return res.sendStatus(httpStatusCodes.NOT_ACCEPTABLE);
            }

            order.lastModifiedBy=daiictId;
            order.lastModified=timeStamp;
            order.collectionTypeCost = cost;
            order.collectionType = {
                courier: courier._id,
            };
            courier.orderId=order._id;
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
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    updateCourier: async (req, res, next) => {
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
            const courier = req.body.courier;

            const order = await Order.findOne({
                _id: orderId,
                requestedBy: daiictId
            });

            if (!order || !order.collectionType.courier) {
                return res.sendStatus(httpStatusCodes.NOT_ACCEPTABLE);
            }

            order.lastModifiedBy=daiictId;
            order.lastModified=timeStamp;

            const newCourier = await Courier.findByIdAndUpdate(order.collectionType.courier,courier);
            const newOrder = await order.save();

            const filteredCourier = filterResourceData(newCourier, readOwnCourierPermission.attributes);
            const filteredOrder = filterResourceData(newOrder, readOwnOrderPermission.attributes);
            res.status(httpStatusCodes.CREATED)
                .json({
                    order: filteredOrder,
                    courier: filteredCourier
                });
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
            const pickup = new Collector(req.body.pickup);
            pickup.createdOn=timeStamp;
            pickup.createdBy=daiictId;

            const cost = await collectionTypeCost(collectionTypes.pickup);
            const order = await Order.findOne({
                _id: orderId,
                requestedBy: daiictId
            });

            if (!order) {
                return res.sendStatus(httpStatusCodes.NOT_ACCEPTABLE);
            }

            order.lastModifiedBy=daiictId;
            order.lastModified=timeStamp;
            order.collectionTypeCost = cost;
            order.collectionType = {
                pickup: pickup._id,
            };
            pickup.orderId=order._id;
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
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    updatePickup: async (req, res, next) => {
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
            const pickup = req.body.pickup;

            const order = await Order.findOne({
                _id: orderId,
                requestedBy: daiictId
            });


            if (!order || !order.collectionType.pickup) {
                return res.sendStatus(httpStatusCodes.NOT_ACCEPTABLE);
            }

            order.lastModifiedBy=daiictId;
            order.lastModified=timeStamp;

            const newPickup = await Collector.findByIdAndUpdate(order.collectionType.pickup,pickup);
            const newOrder = await order.save();

            const filteredPickup = filterResourceData(newPickup, readOwnPickupPermission.attributes);
            const filteredOrder = filterResourceData(newOrder, readOwnOrderPermission.attributes);
            res.status(httpStatusCodes.CREATED)
                .json({
                    order: filteredOrder,
                    pickup: filteredPickup
                });
        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },
};
