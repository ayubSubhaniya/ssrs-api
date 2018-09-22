const httpStatusCodes = require('http-status-codes');

const Service = require('../models/service');
const Courier = require('../models/courier');
const Collector = require('../models/collector');
const Order = require('../models/order');
const Cart = require('../models/cart');
const User = require('../models/user');

const CollectionType = require('../models/collectionType');
const paymentCodeGenerator = require('shortid');

const { filterResourceData, parseSortQuery, parseFilterQuery, convertToStringArray } = require('../helpers/controllerHelpers');
const { accessControl } = require('./access');
const { resources, collectionTypes, sortQueryName, paymentTypes, cartStatus } = require('../configuration');
const errorMessages = require('../configuration/errors');
const { calculateServiceCost, calculateParameterCost, recalculateOrderCost, validateOrder, orderStatus } = require('./order');


const calculateCollectionTypeCost = async (collectionType, orders) => {
    if (collectionType === undefined) {
        return 0;
    }
    const collectionTypeDoc = await CollectionType.findOne({ name: collectionType });

    if (!collectionTypeDoc.isActive) {
        return -1;
    }

    for (let i = 0; i < orders.length; i++) {
        const service = await Service.findById(orders[i].serviceId);
        const collectionTypes = convertToStringArray(service.collectionType);

        if (!collectionTypes.includes(collectionTypeDoc._id.toString())) {
            return -1;
        }
    }

    return collectionTypeDoc.baseCharge;
};

const calculateOrdersCost = async (cart) => {
    let cost = 0;
    const { orders } = cart;
    for (let i = 0; i < orders.length; i++) {
        if (orders[i].status < orderStatus.paymentIncomplete) {
            return -1;
        } else {
            cost += orders[i].totalCost;
        }
    }
    return cost;
};

module.exports = {
    getMyCart: async (req, res, next) => {

        const { user } = req;
        const {cartId} = user;
        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);

        if (readOwnCartPermission.granted) {

            const cart = await Cart.findById(cartId)
                .populate({
                    path: 'orders',
                    select: readOwnOrderPermission.attributes
                })
                .exec();
            cart.orders = await validateOrder(cart.orders);

            const ordersCost = await calculateOrdersCost(cart);
            if (ordersCost === -1) {
                cart.status = cartStatus.invalidOrders;
                cart.validityErrors.push(errorMessages.invalidOrders);
            } else {
                cart.ordersCost = ordersCost;
            }

            const collectionTypeCost = await calculateCollectionTypeCost(cart.collectionType, cart.orders);

            if (collectionTypeCost === -1) {
                cart.status = cartStatus.invalidOrders;
                cart.validityErrors.push(errorMessages.invalidCollectionType);
            } else {
                cart.collectionTypeCost = collectionTypeCost;
            }

            cart.totalCost = cart.collectionTypeCost + cart.ordersCost;

            const filteredCart = await filterResourceData(cart, readOwnCartPermission.attributes);
            res.status(httpStatusCodes.OK)
                .json({ cart: filteredCart });
        } else {
            return res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    getCart: async (req, res, next) => {

        const { user } = req;
        const { cartId } = req.params;

        const readAnyOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        const readAnyCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);

        if (readAnyCartPermission.granted) {
            const cart = await Cart.findById(cartId)
                .populate({
                    path: 'orders',
                    select: readAnyOrderPermission.attributes
                });

            const filteredCart = await filterResourceData(cart, readAnyCartPermission.attributes);
            res.status(httpStatusCodes.OK)
                .json({ cart: filteredCart });
        } else {
            return res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    getAllCart: async (req, res, next) => {

        const { user } = req;

        const readAnyOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        const readAnyCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);

        if (readAnyCartPermission.granted) {
            const cart = await Cart.find({})
                .populate({
                    path: 'orders',
                    select: readAnyOrderPermission.attributes
                });

            const filteredCart = await filterResourceData(cart, readAnyCartPermission.attributes);
            res.status(httpStatusCodes.OK)
                .json({ cart: filteredCart });
        } else {
            return res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    addCourier: async (req, res, next) => {
        const { user } = req;
        const { daiictId, cartId } = user;
        const timeStamp = new Date();

        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);
        const readOwnCourierPermission = accessControl.can(user.userType)
            .readOwn(resources.courier);
        const updateOwnCartPermission = accessControl.can(user.userType)
            .updateOwn(resources.cart);

        if (updateOwnCartPermission.granted) {
            const courier = new Courier(req.value.body);
            courier.createdOn = timeStamp;
            courier.createdBy = daiictId;

            const cart = await Cart.findById(cartId);

            if (!cart) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            } else if (cart.status < cartStatus.placed) {

                const cost = await calculateCollectionTypeCost(collectionTypes.courier, cart.orders);
                if (cost === -1) {
                    res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCollectionType);
                    return;
                }

                cart.collectionTypeCost = cost;

                cart.pickup = undefined;

                cart.collectionType = collectionTypes.courier;
                cart.courier = courier._id;
                courier.cartId = cart._id;

                const newCourier = await courier.save();
                const newCart = await cart.save();

                const filteredCourier = filterResourceData(newCourier, readOwnCourierPermission.attributes);
                const filteredCart = filterResourceData(newCart, readOwnCartPermission.attributes);
                res.status(httpStatusCodes.CREATED)
                    .json({
                        cart: filteredCart,
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
        const { daiictId, cartId } = user;

        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);
        const readOwnCourierPermission = accessControl.can(user.userType)
            .readOwn(resources.courier);
        const updateOwnCartPermission = accessControl.can(user.userType)
            .updateOwn(resources.cart);

        if (updateOwnCartPermission.granted) {
            const courier = req.value.body;

            const cart = await Cart.findById(cartId);

            if (!cart || !cart.courier) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            } else if (cart.status < cartStatus.placed) {

                const cost = await calculateCollectionTypeCost(collectionTypes.courier, cart.orders);
                if (cost === -1) {
                    res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCollectionType);
                    return;
                }

                cart.collectionTypeCost = cost;

                const newCourier = await Courier.findByIdAndUpdate(cart.courier, courier, { new: true });
                /* check if courier is present*/
                const newCart = await cart.save();

                const filteredCourier = filterResourceData(newCourier, readOwnCourierPermission.attributes);
                const filteredCart = filterResourceData(newCart, readOwnCartPermission.attributes);
                res.status(httpStatusCodes.OK)
                    .json({
                        cart: filteredCart,
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
        const { daiictId, cartId } = user;

        const timeStamp = new Date();

        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);
        const readOwnPickupPermission = accessControl.can(user.userType)
            .readOwn(resources.collector);
        const updateOwnCartPermission = accessControl.can(user.userType)
            .updateOwn(resources.cart);

        if (updateOwnCartPermission.granted) {
            const pickup = new Collector(req.value.body);
            pickup.createdOn = timeStamp;
            pickup.createdBy = daiictId;

            const cart = await Cart.findById(cartId);

            if (!cart) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            } else if (cart.status < cartStatus.placed) {

                const cost = await calculateCollectionTypeCost(collectionTypes.pickup, cart.orders);
                if (cost === -1) {
                    res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCollectionType);
                    return;
                }
                cart.collectionTypeCost = cost;
                cart.courier = undefined;

                cart.collectionType = collectionTypes.pickup;
                cart.pickup = pickup._id;
                pickup.cartId = cart._id;

                const newPickup = await pickup.save();
                const newCart = await cart.save();

                const filteredPickup = filterResourceData(newPickup, readOwnPickupPermission.attributes);
                const filteredCart = filterResourceData(newCart, readOwnCartPermission.attributes);
                res.status(httpStatusCodes.CREATED)
                    .json({
                        cart: filteredCart,
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
        const { daiictId, cartId } = user;

        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);
        const readOwnPickupPermission = accessControl.can(user.userType)
            .readOwn(resources.collector);
        const updateOwnCartPermission = accessControl.can(user.userType)
            .updateOwn(resources.cart);

        if (updateOwnCartPermission.granted) {
            const pickup = req.value.body;

            const cart = await Cart.findById(cartId);


            if (!cart || !cart.pickup) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            } else if (cart.status < cartStatus.placed) {

                const cost = await calculateCollectionTypeCost(collectionTypes.pickup, cart.orders);
                if (cost === -1) {
                    res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCollectionType);
                    return;
                }

                cart.collectionTypeCost = cost;

                const newPickup = await Collector.findByIdAndUpdate(cart.pickup, pickup, { new: true });
                const newCart = await cart.save();

                const filteredPickup = filterResourceData(newPickup, readOwnPickupPermission.attributes);
                const filteredCart = filterResourceData(newCart, readOwnCartPermission.attributes);
                res.status(httpStatusCodes.OK)
                    .json({
                        cart: filteredCart,
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
        const { daiictId, cartId } = user;

        const updateOwnCartPermission = accessControl.can(user.userType)
            .updateOwn(resources.cart);
        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);

        if (updateOwnCartPermission.granted) {

            const cartUpdateAtt = req.value.body;
            if (cartUpdateAtt.paymentType === paymentTypes.offline) {
                cartUpdateAtt.status = cartStatus.placed;
                cartUpdateAtt.paymentCode = paymentCodeGenerator.generate();
            } else {
                cartUpdateAtt.status = cartStatus.paymentComplete;
            }

            cartUpdateAtt.lastModifiedBy = daiictId;
            cartUpdateAtt.lastModified = new Date();

            const cartInDb = await Cart.findById(cartId);

            if (!calculateOrdersCost(cartInDb)) {
                cartInDb.status = cartStatus.invalidOrders;
            }

            if (cartInDb) {
                if (cartInDb.status === cartStatus.unplaced) {
                    const updatedCart = await Cart.findByIdAndUpdate(cartId, cartUpdateAtt);

                    const cart = new Cart({
                        requestedBy:daiictId,
                        createdOn: user.createdOn,
                    });
                    await cart.save();
                    user.cartId = cart._id;
                    await user.save();

                    const filteredCart = filterResourceData(updatedCart, readOwnCartPermission.attributes);

                    res.status(httpStatusCodes.OK)
                        .json({ cart: filteredCart });
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

    acceptPayment: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { paymentCode } = req.params;

        const changeStatusPermission = accessControl.can(user.userType)
            .updateAny(resources.changeResourceStatus);
        const readAnyCartPermission = accessControl.can(user.userType)
            .readAny(resources.cart);

        if (changeStatusPermission.granted) {

            const cartUpdateAtt = {
                paymentId: paymentCode
            };
            cartUpdateAtt.lastModifiedBy = daiictId;
            cartUpdateAtt.lastModified = new Date();
            cartUpdateAtt.status = cartStatus.paymentComplete;

            const cartInDb = await Cart.findOne({ paymentCode });

            if (cartInDb) {
                if (cartInDb.status === cartStatus.placed && cartInDb.paymentType === paymentTypes.offline) {
                    const updatedCart = await Cart.findOneAndUpdate({paymentCode}, cartUpdateAtt, { new: true });
                    const filteredCart = filterResourceData(updatedCart, readAnyCartPermission.attributes);

                    res.status(httpStatusCodes.OK)
                        .json({ cart: filteredCart });
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
        const { cartId } = req.params;

        const changeStatusPermission = accessControl.can(user.userType)
            .updateAny(resources.changeResourceStatus);
        const readAnyCartPermission = accessControl.can(user.userType)
            .readAny(resources.cart);

        if (changeStatusPermission.granted) {

            const cartUpdateAtt = req.value.body;

            const cartInDb = await Cart.findById(orderId);

            if (cartUpdateAtt.status - cartInDb.status > 10) {
                return res.status(httpStatusCodes.BAD_REQUEST)
                    .send(errorMessages.invalidStatusChange);
            }

            let updateAtt = {
                lastModifiedBy: daiictId,
                lastModified: new Date()
            };
            switch (cartUpdateAtt.status) {
                case cartStatus.processing:
                    updateAtt.status = cartStatus.processing;
                    break;
                case cartStatus.delivered:
                    if (cartUpdateAtt.courierServiceName === undefined || cartUpdateAtt.trackingId === undefined) {
                        return res.status(httpStatusCodes.BAD_REQUEST)
                            .send(errorMessages.courierInformationRequired);
                    }
                    updateAtt.status = cartStatus.delivered;
                    const updatedCourier = await Courier.findByIdAndUpdate(cartInDb.courier, {
                        courierServiceName: cartUpdateAtt.courierServiceName,
                        trackingId: cartUpdateAtt.trackingId
                    });

                    for (let i = 0; i < cartInDb.orders.length; i++) {
                        await Order.findByIdAndUpdate(cartInDb.orders[i], { status: orderStatus.delivered });
                    }

                    if (!updatedCourier) {
                        return res.sendStatus(httpStatusCodes.NOT_FOUND);
                    }
                    break;
                case cartStatus.readyToPickup:
                    updateAtt.status = cartStatus.readyToPickup;

                    for (let i = 0; i < cartInDb.orders.length; i++) {
                        await Order.findByIdAndUpdate(cartInDb.orders[i], { status: orderStatus.readyToPickup });
                    }

                    break;
            }
            const updatedCart = await Cart.findByIdAndUpdate(cartId, updateAtt, { new: true });
            if (updatedCart) {
                const filteredCart = filterResourceData(updatedCart, readAnyCartPermission.attributes);
                res.status(httpStatusCodes.OK)
                    .json({ cart: filteredCart });
            } else {
                res.sendStatus(httpStatusCodes.NOT_FOUND);
            }
        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },
};
