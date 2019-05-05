const Service = require('../models/service');
const Order = require('../models/order');
const PlacedOrder = require('../models/placedOrder');
const Cart = require('../models/cart');
const Parameter = require('../models/parameter');

const { filterResourceData, convertToStringArray } = require('../helpers/controllerHelpers');
const { orderStatus, systemAdmin } = require('../configuration');
const errorMessages = require('../configuration/errors');
const { generateCustomNotification } = require('../helpers/notificationHelper');

const calculateServiceCost = async (service, requiredUnits, user) => {

    const specialServiceValidation = !service.isSpecialService || service.specialServiceUsers.includes(user.daiictId);
    const useServiceValidation = (!user.userInfo.user_batch || (service.allowedBatches.includes('*') || service.allowedBatches.includes(user.userInfo.user_batch))) &&
        (!user.userInfo.user_programme || (service.allowedProgrammes.includes('*') || service.allowedProgrammes.includes(user.userInfo.user_programme))) &&
        (!user.userInfo.user_status || (service.allowedUserStatus.includes('*') || service.allowedUserStatus.includes(user.userInfo.user_status)));

    if (!specialServiceValidation || !useServiceValidation || !service.isActive || requiredUnits > service.maxUnits || requiredUnits <= 0) {
        return -1;
    }

    return requiredUnits * service.baseCharge;
};

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
            if (!parameter || !parameter.isActive || !availableParameters.includes(parameterId.toString())) {
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
            if (!parameter || !parameter.isActive) {
                return -1;
            }

            totalCost += parameter.baseCharge;
        }
    }

    return totalCost * requiredUnits;
};

const recalculateOrderCost = async (order, user) => {
    const service = await Service.findById(order.service);
    let message = 'Some orders in your cart has became invalid. Please try adding them again!';

    if (!service) {
        await Order.findByIdAndRemove(order._id);

        await Cart.findByIdAndUpdate(order.cartId, {
            'pull': {
                'orders': order._id
            }
        });

        /* Add notification here*/
        const notification = generateCustomNotification(order.requestedBy, systemAdmin, message, order.cartId);
        await notification.save();
        return null;
    }

    const prmtr = order.parameters;
    const requiredUnits = order.unitsRequested;

    const specialServiceValidation = !service.isSpecialService || service.specialServiceUsers.includes(user.daiictId);
    const useServiceValidation = (!user.userInfo.user_batch || (service.allowedBatches.includes('*') || service.allowedBatches.includes(user.userInfo.user_batch))) &&
        (!user.userInfo.user_programme || (service.allowedProgrammes.includes('*') || service.allowedProgrammes.includes(user.userInfo.user_programme))) &&
        (!user.userInfo.user_status || (service.allowedUserStatus.includes('*') || service.allowedUserStatus.includes(user.userInfo.user_status)));

    if (!specialServiceValidation || !useServiceValidation || !service.isActive || requiredUnits > service.maxUnits || requiredUnits <= 0) {
        await Order.findByIdAndRemove(order._id);

        await Cart.findByIdAndUpdate(order.cartId, {
            'pull': {
                'orders': order._id
            }
        });

        /* Add notification here*/
        const notification = generateCustomNotification(order.requestedBy, systemAdmin, message, order.cartId);
        await notification.save();
        return null;
    }

    let availableParameters = service.availableParameters;

    if (availableParameters) {
        availableParameters = convertToStringArray(availableParameters);
        for (let i = 0; i < prmtr.length; i++) {
            const ith_parameter = await Parameter.findById(prmtr[i]);
            let parameterId;
            if (ith_parameter._id) {
                parameterId = ith_parameter._id;
            } else {
                parameterId = ith_parameter;
            }
            const parameter = await Parameter.findById(parameterId);
            if (!parameter || !parameter.isActive || !availableParameters.includes(parameterId.toString())) {
                await Order.findByIdAndRemove(order._id);
                await Cart.findByIdAndUpdate(order.cartId, {
                    'pull': {
                        'orders': order._id
                    }
                });

                /* Add notification here*/
                const notification = generateCustomNotification(order.requestedBy, systemAdmin, message, order.cartId);
                await notification.save();
                return null;
            }
        }
    } else {
        for (let i = 0; i < prmtr.length; i++) {
            const ith_parameter = await Parameter.findById(prmtr[i]);
            let parameterId;
            if (ith_parameter._id) {
                parameterId = ith_parameter._id;
            } else {
                parameterId = ith_parameter;
            }
            const parameter = await Parameter.findById(parameterId);
            if (!parameter || !parameter.isActive) {
                await Order.findByIdAndRemove(order._id);
                await Cart.findByIdAndUpdate(order.cartId, {
                    'pull': {
                        'orders': order._id
                    }
                });

                /* Add notification here*/
                const notification = generateCustomNotification(order.requestedBy, systemAdmin, message, order.cartId);
                await notification.save();
                return null;
            }
        }
    }

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

            if (orders[i].status < orderStatus.placed) {
                const newOrder = await recalculateOrderCost(orders[i], user);
                if (newOrder) {
                    newOrders.push(newOrder);
                }
            } else {
                newOrders.push(orders[i]);
            }
        }

        return newOrders;
    } else if (orders !== undefined) {
        let newOrder = {};

        if (orders.status < orderStatus.placed) {
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

    const placedOrder = await PlacedOrder.find(query)
        .sort(sortQuery);

    const orders = await Order.find(query)
        .sort(sortQuery)
        .populate({
            path: 'parameters',
            select: parameterReadableAtt
        });
    let validatedOrder = await validateOrder(orders, user);
    validatedOrder = validatedOrder.concat(placedOrder);
    return filterResourceData(validatedOrder, readableAttributes);
};

module.exports = {
    calculateServiceCost,
    calculateParameterCost,
    recalculateOrderCost,
    validateOrder,
    validateAddedOrder,
    getOrders
};
