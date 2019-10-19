const httpStatusCodes = require('http-status-codes');
const mustache = require('mustache');
const querystring = require('querystring');
const {orderNoGeneratorSecret} = require('../configuration');
const orderid = require('order-id')(orderNoGeneratorSecret);

const {logger} = require('../configuration/logger');
const Delivery = require('../models/delivery');
const Collector = require('../models/collector');
const Order = require('../models/order');
const PlacedOrder = require('../models/placedOrder');
const PlacedCart = require('../models/placedCart');
const Cart = require('../models/cart');
const UserInfo = require('../models/userInfo');
const EasyPayPaymentInfo = require('../models/easyPayPaymentInfo');

const paymentCodeGenerator = require('shortid');
paymentCodeGenerator.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ()');

const {
    generateCartStatusChangeNotification,
} = require('../helpers/notificationHelper');

const {
    validateCart,
    generateOrderPlacedMailAndNotification,
    generateEasyPayPaymentMailAndNotification,
    getValidCartPaymentError,
    generateNewCartForUser,
    removeCartAndOrders,
    convertToPlacedCart
} = require('../helpers/cartHelper');

const {getEasyPayUrl} = require('../helpers/easyPay');
const {createSHASig} = require('../helpers/crypto');
const {generateInvoice} = require('../helpers/invoiceMaker');
const {filterResourceData, parseSortQuery, parseFilterQuery} = require('../helpers/controllerHelpers');
const {accessControl} = require('./access');
const {
    userTypes,
    homePage,
    easyPaySuccessResponse,
    systemAdmin,
    resources,
    collectionTypes,
    sortQueryName,
    paymentTypes,
    cartStatus,
    orderStatus,
    collectionStatus,
    PAGINATION_SIZE
} = require('../configuration');
const errorMessages = require('../configuration/errors');
const {sendMail} = require('../configuration/mail'),
    mailTemplates = require('../configuration/mailTemplates.json');

const processOfflinePayment = async (user, cartInDb, req, res, next, retry=false) => {
    const readOwnCartPermission = accessControl.can(user.userType)
        .readOwn(resources.cart);

    const {paymentType} = req.value.body;
    cartInDb.paymentType = paymentType;
    cartInDb.status = cartStatus.placed;
    cartInDb.paymentCode = paymentCodeGenerator.generate();
    cartInDb.statusChangeTime.placed = {
        time: new Date(),
        by: systemAdmin
    };

    cartInDb.lastModifiedBy = user.daiictId;
    cartInDb.lastModified = new Date();

    cartInDb = await validateCart(cartInDb, user, true, true);
    if (!cartInDb) {
        return res.status(httpStatusCodes.PRECONDITION_FAILED)
            .send(errorMessages.invalidCart);
    }

    const errorMessage = await getValidCartPaymentError(cartInDb, paymentType);
    if (errorMessage) {
        return res.status(httpStatusCodes.PRECONDITION_FAILED)
            .send(errorMessage);
    }

    const placedCart = await convertToPlacedCart(cartInDb);

    if (!retry){
        await generateNewCartForUser(user);
    }

    await removeCartAndOrders(cartInDb, true);

    await generateOrderPlacedMailAndNotification(user, cartInDb, placedCart);

    const filteredCart = filterResourceData(placedCart, readOwnCartPermission.attributes);

    res.status(httpStatusCodes.OK)
        .json({cart: filteredCart});
};

const processEasyPayPayment = async (user, cartInDb, req, res, next, retry=false) => {
    const readOwnCartPermission = accessControl.can(user.userType)
        .readOwn(resources.cart);

    const {paymentType} = req.value.body;
    cartInDb.status = cartStatus.paymentFailed;
    cartInDb.paymentCode = orderid.generate();
    cartInDb.lastModifiedBy = user.daiictId;
    cartInDb.lastModified = new Date();
    cartInDb.paymentType = paymentType;

    cartInDb = await validateCart(cartInDb, user, true, true);
    if (!cartInDb) {
        return res.status(httpStatusCodes.PRECONDITION_FAILED)
            .send(errorMessages.invalidCart);
    }

    const errorMessage = await getValidCartPaymentError(cartInDb, paymentType);
    if (errorMessage) {
        return res.status(httpStatusCodes.PRECONDITION_FAILED)
            .send(errorMessage);
    }

    for (let i = 0; i < cartInDb.orders.length; i++) {
        await cartInDb.orders[i].save();
    }

    await cartInDb.save();

    const filteredCart = filterResourceData(cartInDb, readOwnCartPermission.attributes);

    if (!retry){
        await generateNewCartForUser(user);
    }

    res.status(httpStatusCodes.OK)
        .json({
            cart: filteredCart,
            url: getEasyPayUrl(cartInDb)
        });
};

module.exports = {
    getMyCart: async (req, res, next) => {

        const {user} = req;
        const {cartId} = user;

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
        const readAnyCollectionType = accessControl.can(user.userType)
            .readAny(resources.collectionType);

        if (readOwnCartPermission.granted && user.userType === userTypes.student) {

            let cart = await Cart.findById(cartId)
                .deepPopulate(['orders', 'orders.service', 'orders.service.availableParameters', 'orders.parameters', 'delivery', 'pickup', 'collectionType'], {
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
                        'orders.service.availableParameters': {
                            select: readAnyParameterPermission.attributes
                        },
                        'orders.parameters': {
                            select: readAnyParameterPermission.attributes
                        },
                        'collectionType': {
                            select: readAnyCollectionType.attributes
                        }
                    }
                });

            cart = await validateCart(cart, user, true, true, true);
            if (!cart) {
                return res.status(httpStatusCodes.PRECONDITION_FAILED)
                    .send(errorMessages.invalidCart);
            }

            const filteredCart = await filterResourceData(cart, readOwnCartPermission.attributes);
            res.status(httpStatusCodes.OK)
                .json({cart: filteredCart});
        } else {
            return res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    getCart: async (req, res, next) => {

        const {user} = req;
        const {daiictId} = user;
        const {cartId} = req.params;

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
        const readAnyCollectionType = accessControl.can(user.userType)
            .readAny(resources.collectionType);

        if (readAnyCartPermission.granted) {
            let cart = await PlacedCart.findById(cartId)
                .populate(['orders']);

            if (!cart) {
                cart = await Cart.findById(cartId)
                    .deepPopulate(['orders.service','orders.service.availableParameters', 'orders.parameters', 'delivery', 'pickup', 'collectionType'], {
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
                            'orders.service.availableParameters' : {
                                select: readAnyParameterPermission.attributes
                            },
                            'orders.parameters': {
                                select: readAnyParameterPermission.attributes
                            },
                            'collectionType': {
                                select: readAnyCollectionType.attributes
                            }
                        }
                    });
            }

            if (!cart) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            }

            if (cart.status >= cartStatus.placed) {
                const filteredCart = await filterResourceData(cart, readAnyCartPermission.attributes);
                res.status(httpStatusCodes.OK)
                    .json({cart: filteredCart});
            } else {
                res.sendStatus(httpStatusCodes.FORBIDDEN);
            }
        } else if (readOwnCartPermission.granted) {
            let cart = await PlacedCart.findOne({
                _id: cartId,
                requestedBy: daiictId
            })
                .populate(['orders']);

            if (!cart) {
                cart = await Cart.findOne({
                    _id: cartId,
                    requestedBy: daiictId
                })
                    .deepPopulate(['orders.service', 'orders.service.availableParameters', 'orders.parameters', 'delivery', 'pickup', 'collectionType'], {
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
                            'orders.service.availableParameters' :{
                                select: readAnyParameterPermission.attributes
                            },
                            'orders.parameters': {
                                select: readAnyParameterPermission.attributes
                            },
                            'collectionType': {
                                select: readAnyCollectionType.attributes
                            }
                        }
                    });
            }

            if (!cart) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            }

            if (cart.status > cartStatus.unplaced) {

                if (cart.status < cartStatus.placed) {
                    cart = await validateCart(cart, user, true, true);
                    if (!cart) {
                        return res.status(httpStatusCodes.PRECONDITION_FAILED)
                            .send(errorMessages.invalidCart);
                    }
                }

                const filteredCart = await filterResourceData(cart, readOwnCartPermission.attributes);

                res.status(httpStatusCodes.OK)
                    .json({cart: filteredCart});
            } else {
                res.sendStatus(httpStatusCodes.FORBIDDEN);
            }
        } else {
            return res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    getAllCart: async (req, res, next) => {

        const {user} = req;
        const {daiictId} = user;
        const pageNo = parseInt(req.query.pageNo || 1);
        const size = parseInt(req.query.size || PAGINATION_SIZE);

        const readAnyCartPermission = accessControl.can(user.userType)
            .readAny(resources.cart);
        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);
        const readAnyServicePermission = accessControl.can(user.userType)
            .readAny(resources.service);
        const readAnyParameterPermission = accessControl.can(user.userType)
            .readAny(resources.parameter);
        const readAnyCollectionTypePermission = accessControl.can(user.userType)
            .readAny(resources.collectionType);

        let query = {};
        let sortQuery = {};
        let cartAttributesPermission = {};
        let orderAttributesPermission = {};
        let pickupAttributesPermission = {};
        let courierAttributesPermission = {};

        if (readAnyCartPermission.granted) {
            query = parseFilterQuery(req.query, readAnyCartPermission.attributes);
            sortQuery = parseSortQuery(req.query[sortQueryName], readAnyCartPermission.attributes);
            if (query.status !== undefined) {
                if (query.status < cartStatus.placed) {
                    query.status = -1;
                }
            } else {
                query.status = {
                    $gte: cartStatus.placed
                };
            }

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
            if (query.status !== undefined) {
                if (query.status <= cartStatus.unplaced) {
                    query.status = -1;
                }
            } else {
                query.status = {
                    $gte: cartStatus.placed
                };
            }
            if (query.requestedBy && query.requestedBy !== daiictId) {
                query.requestedBy = -1;
            } else {
                query.requestedBy = daiictId;
            }

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
        const totalCount = (await Cart.countDocuments(query)) + (await PlacedCart.countDocuments(query));
        const totalPages = Math.ceil(totalCount / size);

        if (pageNo < 0 || pageNo === 0) {
            return res.status(httpStatusCodes.BAD_REQUEST)
                .send(errorMessages.invalidPageRequest);
        }

        const skip = size * (pageNo - 1);
        const limit = size;

        let cart = await Cart.find(query)
            .skip(skip)
            .limit(limit)
            .sort(sortQuery)
            .deepPopulate(['orders.service', 'orders.parameters', 'delivery', 'pickup', 'collectionType'], {
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
                    },
                    'collectionType': {
                        select: readAnyCollectionTypePermission.attributes
                    }
                }
            });

        let validatedCarts = [];
        for (let i = 0; i < cart.length; i++) {
            const validatedCart = await validateCart(cart[i], user, true, true);
            if (validatedCart) {
                validatedCarts.push(validatedCart);
            }
        }

        validatedCarts = validatedCarts.concat(await PlacedCart.find(query)
            .skip(skip)
            .limit(limit)
            .sort(sortQuery)
            .populate(['orders']));

        const filteredCart = await filterResourceData(validatedCarts, cartAttributesPermission);

        const prevUrl = pageNo > 1 ? querystring.stringify({
            pageNo: pageNo - 1,
            size: size
        }) : undefined;
        const nextUrl = pageNo < totalPages ? querystring.stringify({
            pageNo: pageNo + 1,
            size: size
        }) : undefined;

        res.status(httpStatusCodes.OK)
            .json({
                cart: filteredCart,
                prev: prevUrl,
                next: nextUrl
            });
    },

    addDelivery: async (req, res, next) => {
        const {user} = req;
        const {daiictId, cartId} = user;
        const {collectionType} = req.params;
        const timeStamp = new Date();

        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);
        const readOwnCourierPermission = accessControl.can(user.userType)
            .readOwn(resources.delivery);
        const updateOwnCartPermission = accessControl.can(user.userType)
            .updateOwn(resources.cart);
        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        if (updateOwnCartPermission.granted && user.userType === userTypes.student) {
            const delivery = new Delivery(req.value.body);
            delivery.createdOn = timeStamp;
            delivery.createdBy = daiictId;

            let cart = await Cart.findById(cartId)
                .deepPopulate(['orders', 'orders.service', 'orders.parameters'], {
                    populate: {
                        'orders': {
                            select: readOwnOrderPermission.attributes
                        }
                    }
                });

            if (!cart) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            } else if (cart.status === cartStatus.unplaced) {

                cart.pickup = undefined;

                cart.collectionType = collectionType;
                cart.collectionTypeCategory = collectionTypes.delivery;
                cart.delivery = delivery._id;

                cart = await validateCart(cart, user, false, true);

                if (!cart) {
                    return res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCart);
                }

                if (cart.collectionTypeCost === -1) {
                    return res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCollectionType);
                }
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

    updateDelivery: async (req, res, next) => {
        const {user} = req;
        const {daiictId, cartId} = user;
        const {collectionType} = req.params;

        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);
        const readOwnCourierPermission = accessControl.can(user.userType)
            .readOwn(resources.delivery);
        const updateOwnCartPermission = accessControl.can(user.userType)
            .updateOwn(resources.cart);
        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        if (updateOwnCartPermission.granted && user.userType === userTypes.student) {
            const delivery = req.value.body;

            let cart = await Cart.findById(cartId)
                .deepPopulate(['orders', 'orders.service', 'orders.parameters'], {
                    populate: {
                        'orders': {
                            select: readOwnOrderPermission.attributes
                        }
                    }
                });

            if (!cart || !cart.delivery) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            } else if (cart.status === cartStatus.unplaced) {
                cart.collectionType = collectionType;
                cart = await validateCart(cart, user, false, true);
                if (!cart) {
                    return res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCart);
                }

                if (cart.collectionTypeCost === -1) {
                    return res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCollectionType);
                }


                const newDelivery = await Delivery.findByIdAndUpdate(cart.delivery, delivery, {new: true});
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
        const {user} = req;
        const {daiictId, cartId} = user;
        const {collectionType} = req.params;

        const timeStamp = new Date();

        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);
        const readOwnPickupPermission = accessControl.can(user.userType)
            .readOwn(resources.collector);
        const updateOwnCartPermission = accessControl.can(user.userType)
            .updateOwn(resources.cart);
        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        if (updateOwnCartPermission.granted && user.userType === userTypes.student) {
            const pickup = new Collector(req.value.body);
            pickup.createdOn = timeStamp;
            pickup.createdBy = daiictId;

            let cart = await Cart.findById(cartId)
                .deepPopulate(['orders', 'orders.service', 'orders.parameters'], {
                    populate: {
                        'orders': {
                            select: readOwnOrderPermission.attributes
                        }
                    }
                });

            if (!cart) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            } else if (cart.status === cartStatus.unplaced) {

                cart.delivery = undefined;

                cart.collectionType = collectionType;
                cart.collectionTypeCategory = collectionTypes.pickup;
                cart.pickup = pickup._id;

                cart = await validateCart(cart, user, false, true);
                if (!cart) {
                    return res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCart);
                }

                if (cart.collectionTypeCost === -1) {
                    return res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCollectionType);
                }
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
        const {user} = req;
        const {daiictId, cartId} = user;
        const {collectionType} = req.params;

        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);
        const readOwnPickupPermission = accessControl.can(user.userType)
            .readOwn(resources.collector);
        const updateOwnCartPermission = accessControl.can(user.userType)
            .updateOwn(resources.cart);
        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        if (updateOwnCartPermission.granted && user.userType === userTypes.student) {
            const pickup = req.value.body;

            let cart = await Cart.findById(cartId)
                .deepPopulate(['orders', 'orders.service', 'orders.parameters'], {
                    populate: {
                        'orders': {
                            select: readOwnOrderPermission.attributes
                        }
                    }
                });


            if (!cart || !cart.pickup) {
                return res.sendStatus(httpStatusCodes.NOT_FOUND);
            } else if (cart.status === cartStatus.unplaced) {
                cart.collectionType = collectionType;
                cart = await validateCart(cart, user, false, true);
                if (!cart) {
                    return res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCart);
                }

                if (cart.collectionTypeCost === -1) {
                    return res.status(httpStatusCodes.PRECONDITION_FAILED)
                        .send(errorMessages.invalidCollectionType);
                }

                const newPickup = await Collector.findByIdAndUpdate(cart.pickup, pickup, {new: true});
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

    addOfflinePayment: async (req, res, next) => {
        const {user} = req;
        const {cartId} = user;

        const updateOwnCartPermission = accessControl.can(user.userType)
            .updateOwn(resources.cart);

        if (updateOwnCartPermission.granted && user.userType === userTypes.student) {

            const cartInDb = await Cart.findById(cartId)
                .deepPopulate(['orders', 'collectionType', 'delivery', 'pickup', 'orders.service', 'orders.parameters']);

            if (cartInDb) {
                if (cartInDb.status === cartStatus.unplaced) {
                    return processOfflinePayment(user, cartInDb, req, res, next);
                } else if (cartInDb.status === cartStatus.processingPayment) {
                    res.status(httpStatusCodes.BAD_REQUEST)
                        .send(errorMessages.paymentInProcessing);
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

    retryOfflinePayment: async (req, res, next) => {
        const {user} = req;
        const {cartId} = req.params;

        const updateOwnCartPermission = accessControl.can(user.userType)
            .updateOwn(resources.cart);

        if (updateOwnCartPermission.granted && user.userType === userTypes.student) {

            const cartInDb = await Cart.findById(cartId)
                .deepPopulate(['orders', 'collectionType', 'delivery', 'pickup', 'orders.service', 'orders.parameters']);

            if (cartInDb) {
                if (cartInDb.status === cartStatus.paymentFailed) {
                    return processOfflinePayment(user, cartInDb, req, res, next, true);
                } else if (cartInDb.status === cartStatus.processingPayment) {
                    res.status(httpStatusCodes.BAD_REQUEST)
                        .send(errorMessages.paymentInProcessing);
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

    addEasyPayPayment: async (req, res, next) => {
        const {user} = req;
        const {cartId} = user;

        const updateOwnCartPermission = accessControl.can(user.userType)
            .updateOwn(resources.cart);

        if (updateOwnCartPermission.granted && user.userType === userTypes.student) {

            const cartInDb = await Cart.findById(cartId)
                .deepPopulate(['orders', 'collectionType', 'delivery', 'pickup', 'orders.service', 'orders.parameters']);

            if (cartInDb) {
                if (cartInDb.status === cartStatus.unplaced) {
                    return await processEasyPayPayment(user, cartInDb, req, res, next);
                } else if (cartInDb.status === cartStatus.processingPayment) {
                    res.status(httpStatusCodes.BAD_REQUEST)
                        .send(errorMessages.paymentInProcessing);
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

    retryEasyPayPayment: async (req, res, next) => {
        const {user} = req;
        const {cartId} = req.params;
        const {daiictId} = user;

        const updateOwnCartPermission = accessControl.can(user.userType)
            .updateOwn(resources.cart);
        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);
        const readOwnOrderPermission = accessControl.can(user.userType)
            .readOwn(resources.order);

        if (updateOwnCartPermission.granted && user.userType === userTypes.student) {

            const cartInDb = await Cart.findById(cartId)
                .deepPopulate(['orders', 'collectionType', 'delivery', 'pickup', 'orders.service', 'orders.parameters']);

            if (cartInDb) {
                if (cartInDb.status === cartStatus.paymentFailed) {
                    return await processEasyPayPayment(user, cartInDb, req, res, next, true);
                } else if (cartInDb.status === cartStatus.processingPayment) {
                    res.status(httpStatusCodes.BAD_REQUEST)
                        .send(errorMessages.paymentInProcessing);
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

    acceptEasyPayPayment: async (req, res, next) => {
        const responseCode = req.body['Response Code'];
        const uniqueRefNo = req.body['Unique Ref Number'];
        const serviceTaxAmount = req.body['Service Tax Amount'];
        const processingFeeAmount = req.body['Processing Fee Amount'];
        const totalAmount = req.body['Total Amount'];
        const transactionAmount = req.body['Transaction Amount'];
        const transactionDate = req.body['Transaction Date'];
        const interchangeValue = req.body['Interchange Value'];
        const tdr = req.body['TDR'];
        const paymentMode = req.body['Payment Mode'];
        const subMerchantId = req.body['SubMerchantId'];
        const referenceNo = req.body['ReferenceNo'];
        const tps = req.body['TPS'];
        const id = req.body['ID'];
        const rs = req.body['RS'];

        const paymentInfo = new EasyPayPaymentInfo({
            responseCode,
            uniqueRefNo,
            serviceTaxAmount,
            processingFeeAmount,
            totalAmount,
            transactionAmount,
            transactionDate,
            interchangeValue,
            tdr,
            paymentMode,
            subMerchantId,
            referenceNo,
            tps,
            id,
            rs
        });

        await paymentInfo.save();

        const signatureStr = `${id}|${responseCode}|${uniqueRefNo}|${serviceTaxAmount}|${processingFeeAmount}|${totalAmount}|${transactionAmount}|${transactionDate}|${interchangeValue}|${tdr}|${paymentMode}|${subMerchantId}|${referenceNo}|${tps}|${process.env.aeskey}`;
        const SHA512Sig = createSHASig(signatureStr);

        if (SHA512Sig === rs) {

            const cartInDb = await Cart.findOne({paymentCode: referenceNo})
                .deepPopulate(['orders', 'collectionType', 'delivery', 'pickup', 'orders.service', 'orders.parameters']);

            if (cartInDb) {

                if (responseCode !== easyPaySuccessResponse) {
                    cartInDb.status = cartStatus.paymentFailed;
                    cartInDb.statusChangeTime.paymentFailed = {
                        time: new Date(),
                        by: systemAdmin
                    };
                    cartInDb.paymentFailHistory.push({
                        paymentId: uniqueRefNo,
                        paymentDate: transactionDate,
                        paymentType: 'EasyPay'
                    });
                    await cartInDb.save();

                    await generateEasyPayPaymentMailAndNotification(false, cartInDb);

                    const renderInfo = {};
                    renderInfo.orderId = cartInDb.orderId;
                    renderInfo.homePage = homePage;
                    renderInfo.transactionId = uniqueRefNo;
                    renderInfo.date = new Date().toDateString();
                    renderInfo.amount = totalAmount;

                    return res.render('paymentFail', {order: renderInfo});
                }

                const fieldsValidity = subMerchantId === process.env.submerchantid && id === process.env.merchantid;
                if (cartInDb.status === cartStatus.paymentFailed && cartInDb.paymentType === paymentTypes.online && fieldsValidity) {
                    cartInDb.paymentId = uniqueRefNo;
                    cartInDb.paymentStatus = true;
                    cartInDb.status = cartStatus.processing;
                    cartInDb.statusChangeTime.placed = {
                        time: new Date(),
                        by: systemAdmin
                    };
                    cartInDb.statusChangeTime.paymentComplete = {
                        time: new Date(),
                        by: systemAdmin
                    };
                    cartInDb.statusChangeTime.processing = {
                        time: new Date(),
                        by: systemAdmin
                    };

                    if (cartInDb.collectionTypeCategory === collectionTypes.pickup) {
                        cartInDb.pickup.status = collectionStatus.processing;
                    } else if (cartInDb.collectionTypeCategory === collectionTypes.delivery) {
                        cartInDb.delivery.status = collectionStatus.processing;
                    }

                    for (let i = 0; i < cartInDb.orders.length; i++) {
                        cartInDb.orders[i].status = orderStatus.processing;
                        cartInDb.statusChangeTime.placed = {
                            time: new Date(),
                            by: systemAdmin
                        };
                        cartInDb.statusChangeTime.processing = {
                            time: new Date(),
                            by: systemAdmin
                        };
                    }

                    const placedCart = await convertToPlacedCart(cartInDb, true);
                    await removeCartAndOrders(cartInDb, true);
                    await generateEasyPayPaymentMailAndNotification(true, cartInDb, placedCart);

                    const renderInfo = {};
                    renderInfo.orderId = cartInDb.orderId;
                    renderInfo.homePage = homePage;
                    renderInfo.transactionId = uniqueRefNo;
                    renderInfo.date = new Date().toDateString();
                    renderInfo.amount = totalAmount;

                    return res.render('paymentSuccess', {order: renderInfo});

                } else {
                    res.sendStatus(httpStatusCodes.BAD_REQUEST);
                }
            } else {
                res.sendStatus(httpStatusCodes.NOT_FOUND);
            }
        } else {
            res.sendStatus(httpStatusCodes.PRECONDITION_FAILED);
        }
    },

    acceptPayment: async (req, res, next) => {
        const {user} = req;
        const {daiictId} = user;
        const {paymentCode} = req.params;

        const changeStatusPermission = accessControl.can(user.userType)
            .updateAny(resources.changeOrderStatus);
        const readAnyCartPermission = accessControl.can(user.userType)
            .readAny(resources.cart);

        if (changeStatusPermission.granted) {

            const cartInDb = await PlacedCart.findOne({paymentCode});

            if (cartInDb) {
                if (cartInDb.status === cartStatus.placed && cartInDb.paymentType === paymentTypes.offline) {

                    cartInDb.paymentId = paymentCode;
                    cartInDb.lastModifiedBy = daiictId;
                    cartInDb.lastModified = new Date();
                    cartInDb.status = cartStatus.paymentComplete;
                    cartInDb.paymentStatus = true;
                    cartInDb.statusChangeTime.paymentComplete = {
                        time: new Date(),
                        by: daiictId
                    };
                    cartInDb.statusChangeTime.processing = {
                        time: new Date(),
                        by: daiictId
                    };

                    if (cartInDb.collectionTypeCategory === collectionTypes.pickup) {
                        cartInDb.pickup.status = collectionStatus.processing;
                    } else if (cartInDb.collectionTypeCategory === collectionTypes.delivery) {
                        cartInDb.delivery.status = collectionStatus.processing;
                    }

                    for (let i = 0; i < cartInDb.orders.length; i++) {
                        await PlacedOrder.findByIdAndUpdate(cartInDb.orders[i], {
                            status: orderStatus.processing,
                            '$set': {
                                'statusChangeTime.processing': {
                                    time: new Date(),
                                    by: systemAdmin
                                },
                            }
                        });
                    }

                    cartInDb.status = cartStatus.processing;

                    await cartInDb.save();

                    let mailTo = (await UserInfo.findOne({user_inst_id: cartInDb.requestedBy})).user_email_id;
                    let cc = mailTemplates['offlinePaymentAccepted'].cc;
                    let bcc = mailTemplates['offlinePaymentAccepted'].bcc;
                    let mailSubject = mailTemplates['offlinePaymentAccepted'].subject;
                    let options = {
                        orderId: cartInDb.orderId,
                        cartLength: cartInDb.orders.length,
                    };
                    let mailBody = mustache.render(mailTemplates['offlinePaymentAccepted'].body, options);
                    await sendMail(mailTo, cc, bcc, mailSubject, mailBody);

                    const notification = generateCartStatusChangeNotification(cartInDb.requestedBy, daiictId, cartInDb.orders.length, cartInDb.status, '-', cartInDb.id);
                    await notification.save();

                    const filteredCart = filterResourceData(cartInDb, readAnyCartPermission.attributes);

                    res.status(httpStatusCodes.OK)
                        .json({cart: filteredCart});
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
        const {user} = req;
        const {daiictId} = user;
        const {cartId} = req.params;

        const changeStatusPermission = accessControl.can(user.userType)
            .updateAny(resources.changeOrderStatus);
        const readAnyCartPermission = accessControl.can(user.userType)
            .readAny(resources.cart);
        const readAnyOrderPermission = accessControl.can(user.userType)
            .readAny(resources.order);

        if (changeStatusPermission.granted) {

            const cartUpdateAtt = req.value.body;

            const cartInDb = await PlacedCart.findById(cartId)
                .populate({
                    path: 'orders',
                    select: readAnyOrderPermission.attributes
                });

            if (cartInDb) {
                const refundCondition = cartInDb.paymentStatus && cartInDb.status === cartStatus.cancelled && cartUpdateAtt.status === cartStatus.refunded;
                const completeCondition = cartInDb.status === cartStatus.readyToDeliver || cartInDb.status === cartStatus.readyToPickup;
                if (!refundCondition && !completeCondition) {
                    return res.status(httpStatusCodes.BAD_REQUEST)
                        .send(errorMessages.invalidStatusChange);
                }

                cartInDb.lastModifiedBy = daiictId;
                cartInDb.lastModified = new Date();

                const mailTo = (await UserInfo.findOne({user_inst_id: cartInDb.requestedBy})).user_email_id;
                let cc;
                let bcc;
                let mailSubject;
                let mailBody;

                switch (cartUpdateAtt.status) {
                    case cartStatus.refunded:
                        cc = mailTemplates['orderRefunded'].cc;
                        bcc = mailTemplates['orderRefunded'].bcc;
                        mailSubject = mailTemplates['orderRefunded'].subject;

                        cartInDb.status = cartStatus.refunded;
                        cartInDb.statusChangeTime.refunded = {
                            time: new Date(),
                            by: daiictId
                        };

                        if (cartUpdateAtt.comment) {
                            cartInDb.comment.refunded = cartUpdateAtt.comment
                        }

                        if (cartInDb.collectionTypeCategory === collectionTypes.delivery) {
                            cartInDb.delivery.status = collectionStatus.refunded;
                        } else {
                            cartInDb.pickup.status = collectionStatus.refunded;
                        }

                        const options = {
                            orderId: cartInDb.orderId,
                            cartLength: cartInDb.orders.length,
                            totalCost: cartInDb.totalCost
                        };
                        mailBody = mustache.render(mailTemplates['orderRefunded'].body, options);
                        await cartInDb.save();

                        for (let i = 0; i < cartInDb.orders.length; i++) {
                            if (cartInDb.orders[i].status !== orderStatus.cancelled) {
                                await PlacedOrder.findByIdAndUpdate(cartInDb.orders[i], {
                                    status: orderStatus.refunded,
                                    '$set': {
                                        'statusChangeTime.refunded': {
                                            time: new Date(),
                                            by: systemAdmin
                                        },
                                    }
                                });
                            }

                        }
                        break;

                    case cartStatus.completed:
                        cartInDb.status = cartStatus.completed;
                        cartInDb.statusChangeTime.completed = {
                            time: new Date(),
                            by: daiictId
                        };

                        if (cartUpdateAtt.comment) {
                            cartInDb.comment.completed = cartUpdateAtt.comment;
                        }

                        if (cartInDb.collectionTypeCategory === collectionTypes.delivery) {
                            cc = mailTemplates['orderCompleted-Delivery'].cc;
                            bcc = mailTemplates['orderCompleted-Delivery'].bcc;
                            mailSubject = mailTemplates['orderCompleted-Delivery'].subject;

                            if (cartUpdateAtt.courierServiceName === undefined || cartUpdateAtt.trackingId === undefined) {
                                return res.status(httpStatusCodes.PRECONDITION_FAILED)
                                    .send(errorMessages.courierInformationRequired);
                            }

                            cartInDb.delivery.status = collectionStatus.completed;
                            cartInDb.delivery.courierServiceName = cartUpdateAtt.courierServiceName;
                            cartInDb.delivery.trackingId = cartUpdateAtt.trackingId;

                            const options = {
                                orderId: cartInDb.orderId,
                                cartLength: cartInDb.orders.length,
                                courierServiceName: cartInDb.delivery.courierServiceName,
                                trackingId: cartInDb.delivery.trackingId
                            };
                            mailBody = mustache.render(mailTemplates['orderCompleted-Delivery'].body, options);
                        } else {
                            cartInDb.pickup.status = collectionStatus.completed;

                            cc = mailTemplates['orderCompleted-Pickup'].cc;
                            bcc = mailTemplates['orderCompleted-Pickup'].bcc;
                            mailSubject = mailTemplates['orderCompleted-Pickup'].subject;

                            const options = {
                                orderId: cartInDb.orderId,
                                cartLength: cartInDb.orders.length,
                            };
                            mailBody = mustache.render(mailTemplates['orderCompleted-Pickup'].body, options);
                        }
                        for (let i = 0; i < cartInDb.orders.length; i++) {
                            if (cartInDb.orders[i].status !== orderStatus.cancelled) {
                                await PlacedOrder.findByIdAndUpdate(cartInDb.orders[i], {
                                    status: orderStatus.completed,
                                    '$set': {
                                        'statusChangeTime.completed': {
                                            time: new Date(),
                                            by: systemAdmin
                                        },
                                    }
                                });
                            }

                        }
                        break;
                    default :
                        return res.sendStatus(httpStatusCodes.BAD_REQUEST);
                }

                await cartInDb.save();

                await sendMail(mailTo, cc, bcc, mailSubject, mailBody);

                // Generating notification
                const notification = generateCartStatusChangeNotification(cartInDb.requestedBy, daiictId, cartInDb.orders.length, cartInDb.status, '-', cartInDb.id);
                await notification.save();

                // Generating invoice
                generateInvoice(cartId);

                const filteredCart = filterResourceData(cartInDb, readAnyCartPermission.attributes);
                res.status(httpStatusCodes.OK)
                    .json({cart: filteredCart});
            } else {
                res.sendStatus(httpStatusCodes.NOT_FOUND);
            }
        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    cancelCart: async (req, res, next) => {
        const {user} = req;
        const {daiictId} = user;
        const {cartId} = req.params;

        const changeStatusPermission = accessControl.can(user.userType)
            .updateAny(resources.changeOrderStatus);

        if (changeStatusPermission.granted) {

            const cartUpdateAtt = req.value.body;
            const cartInDb = await PlacedCart.findById(cartId);

            if (cartInDb) {
                if (cartInDb.status >= cartStatus.placed && cartInDb.status < cartStatus.completed) {

                    cartInDb.lastModified = new Date();
                    cartInDb.lastModifiedBy = daiictId;
                    cartInDb.status = cartStatus.cancelled;
                    cartInDb.cancelReason = cartUpdateAtt.cancelReason;
                    cartInDb.statusChangeTime.cancelled = {
                        time: new Date(),
                        by: daiictId
                    };

                    if (cartInDb.collectionTypeCategory === collectionTypes.pickup) {
                        cartInDb.pickup.status = collectionStatus.processing;
                    } else if (cartInDb.collectionTypeCategory === collectionTypes.delivery) {
                        cartInDb.delivery.status = collectionStatus.processing;
                    }

                    for (let i = 0; i < cartInDb.orders.length; i++) {
                        await PlacedOrder.findByIdAndUpdate(cartInDb.orders[i], {
                            status: orderStatus.cancelled,
                            lastModified: new Date(),
                            lastModifiedBy: daiictId,
                            cancelReason: cartUpdateAtt.cancelReason,
                            '$set': {
                                'statusChangeTime.cancelled': {
                                    time: new Date(),
                                    by: daiictId
                                }
                            }
                        });
                    }

                    await cartInDb.save();

                    let mailTo = (await UserInfo.findOne({user_inst_id: cartInDb.requestedBy})).user_email_id;
                    let cc = mailTemplates['cancelCart'].cc;
                    let bcc = mailTemplates['cancelCart'].bcc;
                    let mailSubject = mailTemplates['cancelCart'].subject;
                    const options = {
                        orderId: cartInDb.orderId,
                        cancelReason: cartInDb.cancelReason
                    };
                    let mailBody = mustache.render(mailTemplates['cancelCart'].body, options);
                    await sendMail(mailTo, cc, bcc, mailSubject, mailBody);

                    const notification = generateCartStatusChangeNotification(cartInDb.requestedBy, daiictId, cartInDb.orders.length, cartInDb.status, cartInDb.cancelReason, cartInDb.id);
                    await notification.save();

                    res.status(httpStatusCodes.OK)
                        .json({});
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

    addComment: async (req, res, next) => {
        const {user} = req;
        const {daiictId} = user;
        const {cartId} = req.params;

        const readAnyCartPermission = accessControl.can(user.userType)
            .readAny(resources.cart);

        if (readAnyCartPermission.granted) {

            const cartInDb = await PlacedCart.findById(cartId);

            if (cartInDb.status >= cartStatus.processing) {
                const {comment} = req.body;
                switch (cartInDb.status) {
                    case cartStatus.processing:
                        cartInDb.comment.processing = comment;
                        break;
                    case cartStatus.readyToDeliver:
                        cartInDb.comment.readyToDeliver = comment;
                        break;
                    case cartStatus.readyToPickup:
                        cartInDb.comment.readyToPickup = comment;
                        break;
                    case cartStatus.completed:
                        cartInDb.comment.completed = comment;
                        break;
                    case cartStatus.onHold:
                        cartInDb.comment.onHold = comment;
                        break;
                    case cartStatus.cancelled:
                        cartInDb.comment.cancelled = comment;
                        cartInDb.cancelReason = comment;
                        break;
                    case cartStatus.refunded:
                        cartInDb.comment.refunded = comment;
                        break;
                    default:
                        res.sendStatus(httpStatusCodes.BAD_REQUEST);
                }

                await cartInDb.save();
                res.status(httpStatusCodes.OK)
                    .json({});
            } else {
                res.sendStatus(httpStatusCodes.BAD_REQUEST);
            }

        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    getInvoice: async (req, res, next) => {

        const {user} = req;
        const {cartId} = req.params;

        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);

        if (readOwnCartPermission.granted) {
            const cart = await PlacedCart.findById(cartId);
            // const invoiceFile = './data/invoice_pdf/' + cart.orderId + '.pdf';
            // res.attachment(invoiceFile);          // sends 200 OK alongwith invoiceFile
            // res.sendStatus(httpStatusCodes.OK);

            let options = {
                root: (process.env.INVOICE_ROOT_PATH || './data/invoice_pdf'),
                dotfiles: 'deny',
                headers: {
                    'x-timestamp': Date.now(),
                    'x-sent': true,
                    'Content-type': 'application/pdf'
                }
            };

            let fileName = cart.orderId + '.pdf';
            res.sendFile(fileName, options, function (err) {
                if (err) {
                    console.log(err);
                    logger.error(err);
                    res.sendStatus(httpStatusCodes.NOT_FOUND);
                } else {
                    console.log('Sent: ', fileName);
                }
            });

        } else {
            res.sendStatus(httpStatusCodes.FORBIDDEN);
        }
    },

    addZeroCostPayment: async (req, res, next) => {
        const {user} = req;
        const {daiictId, cartId} = user;
        const cartUpdateAtt = req.value.body;

        const updateOwnCartPermission = accessControl.can(user.userType)
            .updateOwn(resources.cart);
        const readOwnCartPermission = accessControl.can(user.userType)
            .readOwn(resources.cart);

        if (updateOwnCartPermission.granted && user.userType === userTypes.student) {

            let cartInDb = await Cart.findById(cartId)
                .deepPopulate(['orders', 'collectionType', 'delivery', 'pickup', 'orders.service', 'orders.parameters']);

            if (cartInDb) {
                if (cartInDb.status === cartStatus.unplaced) {

                    if (cartInDb.totalCost > 0) {
                        return res.sendStatus(httpStatusCodes.BAD_REQUEST);
                    }

                    if (cartUpdateAtt.paymentType !== paymentTypes.noPayment) {
                        return res.status(httpStatusCodes.PRECONDITION_FAILED)
                            .send(errorMessages.invalidPaymentType);
                    }

                    cartInDb.paymentType = cartUpdateAtt.paymentType;
                    cartInDb.status = cartStatus.processing;
                    cartInDb.statusChangeTime.placed = {
                        time: new Date(),
                        by: systemAdmin
                    };
                    cartInDb.statusChangeTime.paymentComplete = {
                        time: new Date(),
                        by: systemAdmin
                    };
                    cartInDb.statusChangeTime.processing = {
                        time: new Date(),
                        by: systemAdmin
                    };
                    cartInDb.lastModifiedBy = user.daiictId;
                    cartInDb.lastModified = new Date();

                    cartInDb = await validateCart(cartInDb, user, true, true);
                    if (!cartInDb) {
                        return res.status(httpStatusCodes.PRECONDITION_FAILED)
                            .send(errorMessages.invalidCart);
                    }

                    const errorMessage = await getValidCartPaymentError(cartInDb, cartInDb.paymentType);
                    if (errorMessage) {
                        return res.status(httpStatusCodes.PRECONDITION_FAILED)
                            .send(errorMessage);
                    }

                    const placedCart = await convertToPlacedCart(cartInDb, true);

                    await generateNewCartForUser(user);

                    await removeCartAndOrders(cartInDb, true);

                    await generateOrderPlacedMailAndNotification(user, cartInDb, placedCart);

                    const filteredCart = filterResourceData(placedCart, readOwnCartPermission.attributes);

                    res.status(httpStatusCodes.OK)
                        .json({cart: filteredCart});
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
