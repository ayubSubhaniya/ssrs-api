const httpStatusCodes = require('http-status-codes');

const Service = require('../models/service');
const Courier = require('../models/courier');
const Collector = require('../models/collector');
const Order = require('../models/order');
const PlacedOrder = require('../models/placedOrder');
const PlacedCart = require('../models/placedCart');
const Cart = require('../models/cart');
const Notification = require('../models/notification');
const CollectionType = require('../models/collectionType');

const paymentCodeGenerator = require('shortid');

const { generateCartStatusChangeNotification } = require('../helpers/notificationHelper');
const { filterResourceData, parseSortQuery, parseFilterQuery, convertToStringArray } = require('../helpers/controllerHelpers');
const { accessControl } = require('./access');
const { resources, collectionTypes, sortQueryName, paymentTypes, cartStatus, orderStatus, collectionStatus, placedOrderAttributes, placedOrderServiceAttributes, placedCartAttributes } = require('../configuration');
const errorMessages = require('../configuration/errors');
const { validateOrder } = require('./order');


const calculateCollectionTypeCost = async (collectionType, orders) => {
    if (collectionType === undefined) {
        return 0;
    }
    const collectionTypeDoc = await CollectionType.findOne({ name: collectionType });

    if (!collectionTypeDoc.isActive) {
        return -1;
    }

    for (let i = 0; i < orders.length; i++) {
        const service = await Service.findById(orders[i].service);
        const collectionTypes = convertToStringArray(service.collectionTypes);

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
        if (orders[i].status < orderStatus.unplaced) {
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
        const { cartId } = user;

        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);
        const readAnyServicePermission = accessControl.can(user.userType)
            .readAny(resources.service);
        const readAnyParameterPermission = accessControl.can(user.userType)
            .readAny(resources.parameter);
        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);
        const readOwnCourierPermission = accessControl.can(user.userType)
            .readOwn(resources.courier);
        const readOwnPickupPermission = accessControl.can(user.userType)
            .readOwn(resources.collector);

        if (readOwnCartPermission.granted) {

            const cart = await Cart.findById(cartId)
                .deepPopulate(['orders.service', 'orders.parameters', 'courier', 'pickup'], {
                    populate: {
                        'orders': {
                            select: readOwnOrderPermission.attributes
                        },
                        'courier': {
                            select: readOwnCourierPermission.attributes
                        },
                        'pickup': {
                            select: readOwnPickupPermission.attributes
                        },
                        'orders.service': {
                            select: readAnyServicePermission.attributes
                        },
                        'orders.parameters': {
                            select: readAnyParameterPermission.attributes
                        }
                    }
                });

            cart.orders = await validateOrder(cart.orders);

            const ordersCost = await calculateOrdersCost(cart);
            if (ordersCost === -1) {
                cart.status = cartStatus.invalid;
                cart.validityErrors.push(errorMessages.invalid);
            } else {
                cart.ordersCost = ordersCost;
            }

            const collectionTypeCost = await calculateCollectionTypeCost(cart.collectionType, cart.orders);

            if (collectionTypeCost === -1) {
                cart.status = cartStatus.invalid;
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
            .readAny(resources.order);
        const readAnyCartPermission = accessControl.can(user.userType)
            .readAny(resources.cart);
        const readAnyServicePermission = accessControl.can(user.userType)
            .readAny(resources.service);
        const readAnyParameterPermission = accessControl.can(user.userType)
            .readAny(resources.parameter);
        const readOwnCourierPermission = accessControl.can(user.userType)
            .readOwn(resources.courier);
        const readOwnPickupPermission = accessControl.can(user.userType)
            .readOwn(resources.collector);

        if (readAnyCartPermission.granted) {
            const cart = await Cart.findById(cartId)
                .deepPopulate(['orders.service', 'orders.parameters', 'courier', 'pickup'], {
                    populate: {
                        'orders': {
                            select: readAnyOrderPermission.attributes
                        },
                        'courier': {
                            select: readOwnCourierPermission.attributes
                        },
                        'pickup': {
                            select: readOwnPickupPermission.attributes
                        },
                        'orders.service': {
                            select: readAnyServicePermission.attributes
                        },
                        'orders.parameters': {
                            select: readAnyParameterPermission.attributes
                        }
                    }
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
        const { daiictId } = user;

        const readAnyCartPermission = accessControl.can(user.userType)
            .readAny(resources.cart);
        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);
        const readAnyServicePermission = accessControl.can(user.userType)
            .readAny(resources.service);
        const readAnyParameterPermission = accessControl.can(user.userType)
            .readAny(resources.parameter);

        let query = {};
        let sortQuery = {};
        let cartAttributesPermission = {};
        let orderAttributesPermission = {};
        let pickupAttributesPermission = {};
        let courierAttributesPermission = {};

        if (readAnyCartPermission.granted) {
            query = parseFilterQuery(req.query, readAnyCartPermission.attributes);
            query.status = {
                $gte: cartStatus.placed
            };
            sortQuery = parseSortQuery(req.query[sortQueryName], readAnyCartPermission.attributes);

            cartAttributesPermission = readAnyCartPermission.attributes;
            orderAttributesPermission = accessControl.can(user.userType)
                .readAny(resources.order).attributes;
            courierAttributesPermission = accessControl.can(user.userType)
                .readAny(resources.courier).attributes;
            pickupAttributesPermission = accessControl.can(user.userType)
                .readAny(resources.collector).attributes;

        } else if (readOwnCartPermission.granted) {
            query = parseFilterQuery(req.query, readOwnCartPermission.attributes);
            sortQuery = parseSortQuery(req.query[sortQueryName], readOwnCartPermission.attributes);
            query.requestedBy = daiictId;

            cartAttributesPermission = readOwnCartPermission.attributes;
            orderAttributesPermission = accessControl.can(user.userType)
                .readOwn(resources.order).attributes;
            courierAttributesPermission = accessControl.can(user.userType)
                .readOwn(resources.courier).attributes;
            pickupAttributesPermission = accessControl.can(user.userType)
                .readOwn(resources.collector).attributes;

        } else {
            return res.sendStatus(httpStatusCodes.FORBIDDEN);
        }

        const cart = await Cart.find(query)
            .sort(sortQuery)
            .deepPopulate(['orders.service', 'orders.parameters', 'courier', 'pickup'], {
                populate: {
                    'orders': {
                        select: orderAttributesPermission
                    },
                    'courier': {
                        select: courierAttributesPermission
                    },
                    'pickup': {
                        select: pickupAttributesPermission
                    },
                    'orders.service': {
                        select: readAnyServicePermission.attributes
                    },
                    'orders.parameters': {
                        select: readAnyParameterPermission.attributes
                    }
                }
            });

        for (let i=0;i<cart.length;i++){
            if (cart[i].status<cartStatus.placed){
                cart[i].orders = await validateOrder(cart[i].orders);

                const ordersCost = await calculateOrdersCost(cart[i]);
                if (ordersCost === -1) {
                    cart[i].status = cartStatus.invalid;
                    cart[i].validityErrors.push(errorMessages.invalid);
                } else {
                    cart[i].ordersCost = ordersCost;
                }

                const collectionTypeCost = await calculateCollectionTypeCost(cart[i].collectionType, cart[i].orders);

                if (collectionTypeCost === -1) {
                    cart[i].status = cartStatus.invalid;
                    cart[i].validityErrors.push(errorMessages.invalidCollectionType);
                } else {
                    cart[i].collectionTypeCost = collectionTypeCost;
                }

                cart[i].totalCost = cart[i].collectionTypeCost + cart[i].ordersCost;
            }
        }

        const filteredCart = await filterResourceData(cart, cartAttributesPermission);
        res.status(httpStatusCodes.OK)
            .json({ cart: filteredCart });
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
        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        if (updateOwnCartPermission.granted) {
            const courier = new Courier(req.value.body);
            courier.createdOn = timeStamp;
            courier.createdBy = daiictId;

            const cart = await Cart.findById(cartId)
                .populate({
                    path: 'orders',
                    select: readOwnOrderPermission.attributes
                });

            if (!cart) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            } else if (cart.status < cartStatus.placed) {

                cart.orders = await validateOrder(cart.orders);

                const ordersCost = await calculateOrdersCost(cart);
                if (ordersCost === -1) {
                    cart.status = cartStatus.invalid;
                    cart.validityErrors.push(errorMessages.invalid);
                } else {
                    cart.ordersCost = ordersCost;
                }

                const cost = await calculateCollectionTypeCost(collectionTypes.courier, cart.orders);
                if (cost === -1) {
                    res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCollectionType);
                    return;
                }


                cart.collectionTypeCost = cost;
                cart.totalCost = cart.collectionTypeCost + cart.ordersCost;

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
        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        if (updateOwnCartPermission.granted) {
            const courier = req.value.body;

            const cart = await Cart.findById(cartId)
                .populate({
                    path: 'orders',
                    select: readOwnOrderPermission.attributes
                });

            if (!cart || !cart.courier) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            } else if (cart.status < cartStatus.placed) {

                cart.orders = await validateOrder(cart.orders);

                const ordersCost = await calculateOrdersCost(cart);
                if (ordersCost === -1) {
                    cart.status = cartStatus.invalid;
                    cart.validityErrors.push(errorMessages.invalid);
                } else {
                    cart.ordersCost = ordersCost;
                }


                const cost = await calculateCollectionTypeCost(collectionTypes.courier, cart.orders);
                if (cost === -1) {
                    res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCollectionType);
                    return;
                }

                cart.collectionTypeCost = cost;
                cart.totalCost = cart.collectionTypeCost + cart.ordersCost;

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
        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        if (updateOwnCartPermission.granted) {
            const pickup = new Collector(req.value.body);
            pickup.createdOn = timeStamp;
            pickup.createdBy = daiictId;

            const cart = await Cart.findById(cartId)
                .populate({
                    path: 'orders',
                    select: readOwnOrderPermission.attributes
                });

            if (!cart) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            } else if (cart.status < cartStatus.placed) {

                cart.orders = await validateOrder(cart.orders);

                const ordersCost = await calculateOrdersCost(cart);
                if (ordersCost === -1) {
                    cart.status = cartStatus.invalid;
                    cart.validityErrors.push(errorMessages.invalid);
                } else {
                    cart.ordersCost = ordersCost;
                }


                const cost = await calculateCollectionTypeCost(collectionTypes.pickup, cart.orders);
                if (cost === -1) {
                    res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCollectionType);
                    return;
                }
                cart.collectionTypeCost = cost;
                cart.totalCost = cart.collectionTypeCost + cart.ordersCost;
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
        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        if (updateOwnCartPermission.granted) {
            const pickup = req.value.body;

            const cart = await Cart.findById(cartId)
                .populate({
                    path: 'orders',
                    select: readOwnOrderPermission.attributes
                });


            if (!cart || !cart.pickup) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            } else if (cart.status < cartStatus.placed) {

                cart.orders = await validateOrder(cart.orders);

                const ordersCost = await calculateOrdersCost(cart);
                if (ordersCost === -1) {
                    cart.status = cartStatus.invalid;
                    cart.validityErrors.push(errorMessages.invalid);
                } else {
                    cart.ordersCost = ordersCost;
                }


                const cost = await calculateCollectionTypeCost(collectionTypes.pickup, cart.orders);
                if (cost === -1) {
                    res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCollectionType);
                    return;
                }

                cart.collectionTypeCost = cost;
                cart.totalCost = cart.collectionTypeCost + cart.ordersCost;

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
        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

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

            const cartInDb = await Cart.findById(cartId)
                .populate({
                    path: 'orders',
                    select: readOwnOrderPermission.attributes
                });

            if (cartInDb) {

                cartInDb.orders = await validateOrder(cartInDb.orders);

                const ordersCost = await calculateOrdersCost(cartInDb);
                if (ordersCost === -1) {
                    cartInDb.status = cartStatus.invalid;
                    cartInDb.validityErrors.push(errorMessages.invalid);
                } else {
                    cartInDb.ordersCost = ordersCost;
                }

                const collectionTypeCost = await calculateCollectionTypeCost(collectionTypes.courier, cartInDb.orders);
                if (collectionTypeCost === -1) {
                    res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCollectionType);
                    return;
                }
                cartInDb.collectionTypeCost = collectionTypeCost;
                cartInDb.totalCost = cartInDb.collectionTypeCost + cartInDb.ordersCost;

                if (cartInDb.orders.length === 0) {
                    return res.status(httpStatusCodes.BAD_REQUEST)
                        .send(errorMessages.noOrdersInCart);
                }
                if (ordersCost === -1) {
                    cartInDb.status = cartStatus.invalid;
                    return res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalid);
                }

                if (cartInDb.courier === undefined && cartInDb.pickup === undefined) {
                    return res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.noCollectionType);
                }

                if (cartInDb.status === cartStatus.unplaced) {

                    /* save final cart and orders*/
                    for (let i = 0; i < cartInDb.orders.length; i++) {
                        await cartInDb.orders[i].save();
                    }

                    await cartInDb.save();

                    const placedCartDoc = filterResourceData(cartInDb, placedCartAttributes);
                    placedCartDoc.cartId = cartInDb._id;

                    if (cartUpdateAtt.status === cartStatus.paymentComplete) {

                        if (cartInDb.collectionType === collectionTypes.pickup) {
                            await Collector.findByIdAndUpdate(cartInDb.pickup, { status: collectionStatus.processing });
                        } else if (cartInDb.collectionType === collectionTypes.courier) {
                            await Courier.findByIdAndUpdate(cartInDb.courier, { status: collectionStatus.processing });
                        }

                        for (let i = 0; i < cartInDb.orders.length; i++) {
                            const order = await Order.findByIdAndUpdate(cartInDb.orders[i], { status: orderStatus.processing }, { new: true })
                                .populate('service');

                            const placedOrderDoc = filterResourceData(order, placedOrderAttributes);
                            placedOrderDoc.service = filterResourceData(placedOrderDoc.service, placedOrderServiceAttributes);
                            placedOrderDoc.orderId = order._id;

                            const placedOrder = new PlacedOrder(placedOrderDoc);
                            await placedOrder.save();
                            placedCartDoc.orders[i] = placedOrder._id;
                        }
                        cartUpdateAtt.status = cartStatus.processing;
                    } else {
                        for (let i = 0; i < cartInDb.orders.length; i++) {
                            const order = await Order.findByIdAndUpdate(cartInDb.orders[i], { status: orderStatus.placed }, { new: true })
                                .populate('service');
                            const placedOrderDoc = filterResourceData(order, placedOrderAttributes);
                            placedOrderDoc.service = filterResourceData(placedOrderDoc.service, placedOrderServiceAttributes);
                            placedOrderDoc.orderId = order._id;

                            const placedOrder = new PlacedOrder(placedOrderDoc);
                            await placedOrder.save();
                            placedCartDoc.orders[i] = placedOrder._id;
                        }
                    }

                    placedCartDoc.status = cartUpdateAtt.status;
                    const placedCart = new PlacedCart(placedCartDoc);
                    await placedCart.save();

                    const notification = generateCartStatusChangeNotification(daiictId, 'System', cartInDb.orders.length, cartUpdateAtt.status);
                    await notification.save();

                    const updatedCart = await Cart.findByIdAndUpdate(cartId, cartUpdateAtt, { new: true });

                    const cart = new Cart({
                        requestedBy: daiictId,
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

                    if (cartInDb.collectionType === collectionTypes.pickup) {
                        await Collector.findByIdAndUpdate(cartInDb.pickup, { status: collectionStatus.processing });
                    } else if (cartInDb.collectionType === collectionTypes.courier) {
                        await Courier.findByIdAndUpdate(cartInDb.courier, { status: collectionStatus.processing });
                    }

                    for (let i = 0; i < cartInDb.orders.length; i++) {
                        await Order.findByIdAndUpdate(cartInDb.orders[i], { status: orderStatus.processing });
                    }

                    cartUpdateAtt.status = cartStatus.processing;

                    const updatedCart = await Cart.findOneAndUpdate({ paymentCode }, cartUpdateAtt, { new: true });

                    const notification = generateCartStatusChangeNotification(cartInDb.requestedBy, daiictId, cartInDb.orders.length, cartUpdateAtt.status);
                    await notification.save();

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
        const readAnyOrderPermission = accessControl.can(user.userType)
            .readAny(resources.order);

        if (changeStatusPermission.granted) {

            const cartUpdateAtt = req.value.body;

            const cartInDb = await Cart.findById(cartId)
                .populate({
                    path: 'orders',
                    select: readAnyOrderPermission.attributes
                });

            if (cartInDb) {
                if (cartInDb.status !== cartStatus.readyToDeliver && cartInDb.status !== cartStatus.readyToPickup) {
                    return res.status(httpStatusCodes.BAD_REQUEST)
                        .send(errorMessages.invalidStatusChange);
                }

                let updateAtt = {
                    lastModifiedBy: daiictId,
                    lastModified: new Date()
                };
                switch (cartUpdateAtt.status) {
                    case cartStatus.completed:
                        updateAtt.status = cartStatus.completed;
                        if (cartInDb.collectionType === collectionTypes.courier) {
                            if (cartUpdateAtt.courierServiceName === undefined || cartUpdateAtt.trackingId === undefined) {
                                return res.status(httpStatusCodes.PRECONDITION_FAILED)
                                    .send(errorMessages.courierInformationRequired);
                            }

                            await Courier.findByIdAndUpdate(cartInDb.courier, { status: collectionStatus.completed });

                            const updatedCourier = await Courier.findByIdAndUpdate(cartInDb.courier, {
                                courierServiceName: cartUpdateAtt.courierServiceName,
                                trackingId: cartUpdateAtt.trackingId
                            });

                            if (!updatedCourier) {
                                return res.sendStatus(httpStatusCodes.NOT_FOUND);
                            }


                        } else {
                            await Collector.findByIdAndUpdate(cartInDb.pickup, { status: collectionStatus.completed });
                        }
                        for (let i = 0; i < cartInDb.orders.length; i++) {
                            if (cartInDb.orders[i].status !== orderStatus.cancelled) {
                                await Order.findByIdAndUpdate(cartInDb.orders[i], { status: orderStatus.completed });
                                await PlacedOrder.findOneAndUpdate({orderId:cartInDb.orders[i]},{status:orderStatus.completed});
                            }

                        }
                        break;
                    default :
                        return res.sendStatus(httpStatusCodes.BAD_REQUEST);
                }

                await PlacedCart.findOneAndUpdate({cartId},{status:cartStatus.completed});
                const updatedCart = await Cart.findByIdAndUpdate(cartId, updateAtt, { new: true });
                if (updatedCart) {
                    const filteredCart = filterResourceData(updatedCart, readAnyCartPermission.attributes);
                    res.status(httpStatusCodes.OK)
                        .json({ cart: filteredCart });
                } else {
                    res.sendStatus(httpStatusCodes.NOT_FOUND);
                }
            } else {
                res.sendStatus(httpStatusCodes.NOT_FOUND);
            }
        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    cancelCart: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { cartId } = req.params;

        const changeStatusPermission = accessControl.can(user.userType)
            .updateAny(resources.changeResourceStatus);

        if (changeStatusPermission.granted) {

            const cartUpdateAtt = req.value.body;
            cartUpdateAtt.lastModified = new Date();
            cartUpdateAtt.lastModifiedBy = daiictId;
            cartUpdateAtt.status = cartStatus.cancelled;

            const cartInDb = await Cart.findById(cartId);

            if (cartInDb) {
                if (cartInDb.status >= cartStatus.placed) {
                    await Cart.findByIdAndUpdate(cartId, cartUpdateAtt);
                    await PlacedCart.findOneAndUpdate({ cartId }, {
                        status: cartStatus.cancelled,
                        cancelReason: cartUpdateAtt.cancelReason
                    });

                    for (let i = 0; i < cartInDb.orders.length; i++) {
                        await Order.findByIdAndUpdate(cartInDb.orders[i], {
                            status: orderStatus.cancelled,
                            lastModified: cartUpdateAtt.lastModified,
                            lastModifiedBy: daiictId,
                            cancelReason: cartUpdateAtt.cancelReason
                        });

                        await PlacedOrder.findOneAndUpdate({ orderId: cartInDb.orders[i] }, {
                            status: orderStatus.cancelled,
                            cancelReason: cartUpdateAtt.cancelReason
                        });
                    }
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
