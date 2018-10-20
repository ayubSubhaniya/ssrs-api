const httpStatusCodes = require('http-status-codes');

const Service = require('../models/service');
const Delivery = require('../models/delivery');
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


const calculateCollectionTypeCost = async (collectionType, orders, collectionTypeCategory) => {
    if (collectionType === undefined) {
        return 0;
    }
    const collectionTypeDoc = await CollectionType.findOne({ _id: collectionType });

    if (!collectionTypeDoc.isActive) {
        return -1;
    }

    if (collectionTypeCategory!==undefined && collectionTypeDoc.category !== collectionTypeCategory) {
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

const checkPaymentMode = async (cart, paymentMode) => {
    //paymentMode = paymentMode.toLowerCase();
    const { orders } = cart;
    for (let i = 0; i < orders.length; i++) {
        const service = await Service.findById(orders[i].service);
        if (!service.availablePaymentModes.includes(paymentMode)) {
            return false;
        }
    }
    return true;
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
            .readOwn(resources.delivery);
        const readOwnPickupPermission = accessControl.can(user.userType)
            .readOwn(resources.collector);

        if (readOwnCartPermission.granted) {

            const cart = await Cart.findById(cartId)
                .deepPopulate(['orders.service', 'orders.parameters', 'delivery', 'pickup'], {
                    populate: {
                        'orders': {
                            select: readOwnOrderPermission.attributes
                        },
                        'delivery': {
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
        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);
        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);
        const readAnyServicePermission = accessControl.can(user.userType)
            .readAny(resources.service);
        const readAnyParameterPermission = accessControl.can(user.userType)
            .readAny(resources.parameter);
        const readOwnCourierPermission = accessControl.can(user.userType)
            .readOwn(resources.delivery);
        const readOwnPickupPermission = accessControl.can(user.userType)
            .readOwn(resources.collector);
        const readAnyCourierPermission = accessControl.can(user.userType)
            .readAny(resources.delivery);
        const readAnyPickupPermission = accessControl.can(user.userType)
            .readAny(resources.collector);

        if (readAnyCartPermission.granted) {
            const cart = await Cart.findById(cartId)
                .deepPopulate(['orders.service', 'orders.parameters', 'delivery', 'pickup'], {
                    populate: {
                        'orders': {
                            select: readAnyOrderPermission.attributes
                        },
                        'delivery': {
                            select: readAnyCourierPermission.attributes
                        },
                        'pickup': {
                            select: readAnyPickupPermission.attributes
                        },
                        'orders.service': {
                            select: readAnyServicePermission.attributes
                        },
                        'orders.parameters': {
                            select: readAnyParameterPermission.attributes
                        }
                    }
                });
            if (cart.status >= cartStatus.placed) {
                const filteredCart = await filterResourceData(cart, readAnyCartPermission.attributes);
                res.status(httpStatusCodes.OK)
                    .json({ cart: filteredCart });
            } else {
                res.sendStatus(httpStatusCodes.FORBIDDEN);
            }
        } else if (readOwnCartPermission.granted) {
            const cart = await Cart.findById(cartId)
                .deepPopulate(['orders.service', 'orders.parameters', 'delivery', 'pickup'], {
                    populate: {
                        'orders': {
                            select: readOwnOrderPermission.attributes
                        },
                        'delivery': {
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
            if (cart.status >= cartStatus.placed) {
                const filteredCart = await filterResourceData(cart, readOwnCartPermission.attributes);
                res.status(httpStatusCodes.OK)
                    .json({ cart: filteredCart });
            } else {
                res.sendStatus(httpStatusCodes.FORBIDDEN);
            }
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
            if (query.status !== undefined) {
                if (query.status < cartStatus.placed) {
                    query.status = -1;
                }
            } else {
                query.status = {
                    $gte: cartStatus.placed
                };
            }

            sortQuery = parseSortQuery(req.query[sortQueryName], readAnyCartPermission.attributes);

            cartAttributesPermission = readAnyCartPermission.attributes;
            orderAttributesPermission = accessControl.can(user.userType)
                .readAny(resources.order).attributes;
            courierAttributesPermission = accessControl.can(user.userType)
                .readAny(resources.delivery).attributes;
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
                .readOwn(resources.delivery).attributes;
            pickupAttributesPermission = accessControl.can(user.userType)
                .readOwn(resources.collector).attributes;

        } else {
            return res.sendStatus(httpStatusCodes.FORBIDDEN);
        }

        const cart = await Cart.find(query)
            .sort(sortQuery)
            .deepPopulate(['orders.service', 'orders.parameters', 'delivery', 'pickup'], {
                populate: {
                    'orders': {
                        select: orderAttributesPermission
                    },
                    'delivery': {
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

        for (let i = 0; i < cart.length; i++) {
            if (cart[i].status < cartStatus.placed) {
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

    addDelivery: async (req, res, next) => {
        const { user } = req;
        const { daiictId, cartId } = user;
        const { collectionType } = req.params;
        const timeStamp = new Date();

        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);
        const readOwnCourierPermission = accessControl.can(user.userType)
            .readOwn(resources.delivery);
        const updateOwnCartPermission = accessControl.can(user.userType)
            .updateOwn(resources.cart);
        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        if (updateOwnCartPermission.granted) {
            const delivery = new Delivery(req.value.body);
            delivery.createdOn = timeStamp;
            delivery.createdBy = daiictId;

            const cart = await Cart.findById(cartId)
                .populate({
                    path: 'orders',
                    select: readOwnOrderPermission.attributes
                });

            if (!cart) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            } else if (cart.status === cartStatus.unplaced) {

                cart.orders = await validateOrder(cart.orders);

                const ordersCost = await calculateOrdersCost(cart);
                if (ordersCost === -1) {
                    cart.status = cartStatus.invalid;
                    cart.validityErrors.push(errorMessages.invalid);
                } else {
                    cart.ordersCost = ordersCost;
                }

                const cost = await calculateCollectionTypeCost(collectionType, cart.orders, collectionTypes.delivery);
                if (cost === -1) {
                    res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCollectionType);
                    return;
                }


                cart.collectionTypeCost = cost;
                cart.totalCost = cart.collectionTypeCost + cart.ordersCost;

                cart.pickup = undefined;

                cart.collectionType = collectionType;
                cart.collectionTypeCategory = collectionTypes.delivery;
                cart.delivery = delivery._id;
                delivery.cartId = cart._id;

                const newDelivery = await delivery.save();
                const newCart = await cart.save();

                const filteredDelivery = filterResourceData(newDelivery, readOwnCourierPermission.attributes);
                const filteredCart = filterResourceData(newCart, readOwnCartPermission.attributes);
                res.status(httpStatusCodes.CREATED)
                    .json({
                        cart: filteredCart,
                        delivery: filteredDelivery
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
        const { collectionType } = req.params;

        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);
        const readOwnCourierPermission = accessControl.can(user.userType)
            .readOwn(resources.delivery);
        const updateOwnCartPermission = accessControl.can(user.userType)
            .updateOwn(resources.cart);
        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        if (updateOwnCartPermission.granted) {
            const delivery = req.value.body;

            const cart = await Cart.findById(cartId)
                .populate({
                    path: 'orders',
                    select: readOwnOrderPermission.attributes
                });

            if (!cart || !cart.delivery) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            } else if (cart.status === cartStatus.unplaced) {

                cart.orders = await validateOrder(cart.orders);

                const ordersCost = await calculateOrdersCost(cart);
                if (ordersCost === -1) {
                    cart.status = cartStatus.invalid;
                    cart.validityErrors.push(errorMessages.invalid);
                } else {
                    cart.ordersCost = ordersCost;
                }


                const cost = await calculateCollectionTypeCost(collectionType, cart.orders, collectionTypes.delivery);
                if (cost === -1) {
                    res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCollectionType);
                    return;
                }

                cart.collectionType = collectionType;
                cart.collectionTypeCost = cost;
                cart.totalCost = cart.collectionTypeCost + cart.ordersCost;

                const newDelivery = await Delivery.findByIdAndUpdate(cart.delivery, delivery, { new: true });
                /* check if delivery is present*/
                const newCart = await cart.save();

                const filteredDelivery = filterResourceData(newDelivery, readOwnCourierPermission.attributes);
                const filteredCart = filterResourceData(newCart, readOwnCartPermission.attributes);
                res.status(httpStatusCodes.OK)
                    .json({
                        cart: filteredCart,
                        delivery: filteredDelivery
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
        const { collectionType } = req.params;

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
            } else if (cart.status === cartStatus.unplaced) {

                cart.orders = await validateOrder(cart.orders);

                const ordersCost = await calculateOrdersCost(cart);
                if (ordersCost === -1) {
                    cart.status = cartStatus.invalid;
                    cart.validityErrors.push(errorMessages.invalid);
                } else {
                    cart.ordersCost = ordersCost;
                }


                const cost = await calculateCollectionTypeCost(collectionType, cart.orders, collectionTypes.pickup);
                if (cost === -1) {
                    res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCollectionType);
                    return;
                }
                cart.collectionTypeCost = cost;
                cart.totalCost = cart.collectionTypeCost + cart.ordersCost;
                cart.courier = undefined;

                cart.collectionType = collectionType;
                cart.collectionTypeCategory = collectionTypes.pickup;
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
        const { collectionType } = req.params;

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
            } else if (cart.status === cartStatus.unplaced) {

                cart.orders = await validateOrder(cart.orders);

                const ordersCost = await calculateOrdersCost(cart);
                if (ordersCost === -1) {
                    cart.status = cartStatus.invalid;
                    cart.validityErrors.push(errorMessages.invalid);
                } else {
                    cart.ordersCost = ordersCost;
                }


                const cost = await calculateCollectionTypeCost(collectionType, cart.orders, collectionTypes.pickup);
                if (cost === -1) {
                    res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCollectionType);
                    return;
                }

                cart.collectionType = collectionType;
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

            const cartInDb = await Cart.findById(cartId)
                .populate({
                    path: 'orders',
                    select: readOwnOrderPermission.attributes
                });

            if (cartInDb) {
                if (cartInDb.status === cartStatus.unplaced) {
                    const cartUpdateAtt = req.value.body;
                    if (cartUpdateAtt.paymentType === paymentTypes.offline) {
                        cartUpdateAtt.status = cartStatus.placed;
                        cartUpdateAtt.paymentCode = paymentCodeGenerator.generate();
                    } else {
                        cartUpdateAtt.status = cartStatus.paymentComplete;
                    }

                    cartUpdateAtt.lastModifiedBy = daiictId;
                    cartUpdateAtt.lastModified = new Date();

                    cartInDb.orders = await validateOrder(cartInDb.orders);

                    const ordersCost = await calculateOrdersCost(cartInDb);
                    if (ordersCost === -1) {
                        cartInDb.status = cartStatus.invalid;
                        cartInDb.validityErrors.push(errorMessages.invalid);
                    } else {
                        cartInDb.ordersCost = ordersCost;
                    }

                    const collectionTypeCost = await calculateCollectionTypeCost(cartInDb.collectionType, cartInDb.orders);
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

                    if (cartInDb.delivery === undefined && cartInDb.pickup === undefined) {
                        return res.status(httpStatusCodes.PRECONDITION_FAILED)
                            .send(errorMessages.noCollectionType);
                    }

                    if (!(await checkPaymentMode(cartInDb, cartUpdateAtt.paymentType))) {
                        return res.status(httpStatusCodes.PRECONDITION_FAILED)
                            .send(errorMessages.invalidPaymentType);
                    }

                    /* save final cart and orders*/
                    for (let i = 0; i < cartInDb.orders.length; i++) {
                        await cartInDb.orders[i].save();
                    }

                    await cartInDb.save();

                    const placedCartDoc = filterResourceData(cartInDb, placedCartAttributes);
                    placedCartDoc.cartId = cartInDb._id;

                    if (cartUpdateAtt.status === cartStatus.paymentComplete) {

                        if (cartInDb.collectionTypeCategory === collectionTypes.pickup) {
                            await Collector.findByIdAndUpdate(cartInDb.pickup, { status: collectionStatus.processing });
                        } else if (cartInDb.collectionTypeCategory === collectionTypes.delivery) {
                            await Delivery.findByIdAndUpdate(cartInDb.delivery, { status: collectionStatus.processing });
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
                }
                else {
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

                    if (cartInDb.collectionTypeCategory === collectionTypes.pickup) {
                        await Collector.findByIdAndUpdate(cartInDb.pickup, { status: collectionStatus.processing });
                    } else if (cartInDb.collectionTypeCategory === collectionTypes.delivery) {
                        await Delivery.findByIdAndUpdate(cartInDb.delivery, { status: collectionStatus.processing });
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
                        if (cartInDb.collectionTypeCategory === collectionTypes.delivery) {
                            if (cartUpdateAtt.courierServiceName === undefined || cartUpdateAtt.trackingId === undefined) {
                                return res.status(httpStatusCodes.PRECONDITION_FAILED)
                                    .send(errorMessages.courierInformationRequired);
                            }

                            await Delivery.findByIdAndUpdate(cartInDb.delivery, { status: collectionStatus.completed });

                            const updatedDelivery = await Delivery.findByIdAndUpdate(cartInDb.delivery, {
                                courierServiceName: cartUpdateAtt.courierServiceName,
                                trackingId: cartUpdateAtt.trackingId
                            });

                            if (!updatedDelivery) {
                                return res.sendStatus(httpStatusCodes.NOT_FOUND);
                            }


                        } else {
                            await Collector.findByIdAndUpdate(cartInDb.pickup, { status: collectionStatus.completed });
                        }
                        for (let i = 0; i < cartInDb.orders.length; i++) {
                            if (cartInDb.orders[i].status !== orderStatus.cancelled) {
                                await Order.findByIdAndUpdate(cartInDb.orders[i], { status: orderStatus.completed });
                                await PlacedOrder.findOneAndUpdate({ orderId: cartInDb.orders[i] }, { status: orderStatus.completed });
                            }

                        }
                        break;
                    default :
                        return res.sendStatus(httpStatusCodes.BAD_REQUEST);
                }

                await PlacedCart.findOneAndUpdate({ cartId }, { status: cartStatus.completed });
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
                if (cartInDb.status >= cartStatus.placed && cartInDb.status < cartStatus.completed) {
                    await Cart.findByIdAndUpdate(cartId, cartUpdateAtt);
                    await PlacedCart.findOneAndUpdate({ cartId }, {
                        status: cartStatus.cancelled,
                        cancelReason: cartUpdateAtt.cancelReason
                    });

                    if (cartInDb.collectionTypeCategory === collectionTypes.delivery) {
                        await Delivery.findByIdAndUpdate(cartInDb.delivery, { status: collectionStatus.cancel });
                    } else if (cartInDb.collectionTypeCategory === collectionTypes.pickup) {
                        await Collector.findByIdAndUpdate(cartInDb.pickup, { status: collectionStatus.cancel });
                    }

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
