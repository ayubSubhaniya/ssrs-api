const Service = require('../models/service');
const Order = require('../models/order');
const PlacedOrder = require('../models/placedOrder');
const Cart = require('../models/cart');
const Parameter = require('../models/parameter');

const { filterResourceData, convertToStringArray, filterActiveData, getIdsFromDoc } = require('../helpers/controllerHelpers');
const { orderStatus, systemAdmin } = require('../configuration');
const errorMessages = require('../configuration/errors');
const { generateCustomNotification } = require('../helpers/notificationHelper');
const { INVALID_ORDER_DELETED } = require('../constants/strings');

const removeOrder = async (order) => {
    if (!order){
        return;
    }
    let message = INVALID_ORDER_DELETED;
    await Order.findByIdAndRemove(order._id);

    await Cart.findByIdAndUpdate(order.cartId, {
        'pull': {
            'orders': order._id
        }
    });

    /* Add notification here*/
    const notification = generateCustomNotification(order.requestedBy, systemAdmin, message);
    await notification.save();
};

const calculateServiceCost = async (service, requiredUnits, user) => {
    if (!service || !user){
        return -1;
    }
    const specialServiceValidation = !service.isSpecialService || service.specialServiceUsers.includes(user.daiictId);
    const useServiceValidation = (!user.userInfo.user_batch || !service.allowedBatches || (service.allowedBatches.includes('*') || service.allowedBatches.includes(user.userInfo.user_batch))) &&
        (!user.userInfo.user_programme || !service.allowedProgrammes || (service.allowedProgrammes.includes('*') || service.allowedProgrammes.includes(user.userInfo.user_programme))) &&
        (!user.userInfo.user_status || !service.allowedUserStatus || (service.allowedUserStatus.includes('*') || service.allowedUserStatus.includes(user.userInfo.user_status)));

    if (!specialServiceValidation || !useServiceValidation || !service.isActive || requiredUnits > service.maxUnits || requiredUnits <= 0) {
        return -1;
    }

    return requiredUnits * service.baseCharge;
};

const calculateParameterCost = async (parameters, requiredUnits, availableParameters, populated = false) => {
    if (!parameters){
        return -1;
    }
    let totalCost = 0;

    if (populated){
        availableParameters = getIdsFromDoc(availableParameters);
    } else {
        availableParameters = convertToStringArray(availableParameters);
    }

    for (let i = 0; i < parameters.length; i++) {
        let parameter;
        if (populated) {
            parameter = parameters[i];
        } else {
            parameter = await Parameter.findById(parameters[i]);
        }
        if (!parameter || !parameter.isActive || !availableParameters.includes(parameter._id.toString())) {
            return -1;
        }

        totalCost += parameter.baseCharge;
    }
    return totalCost * requiredUnits;
};

const recalculateOrderCost = async (order, user, populated = false) => {
    if (!order){
        return null;
    }
    let service;
    if (populated) {
        service = order.service;
    } else {
        service = await Service.findById(order.service);
    }

    if (!service) {
        await removeOrder(order);
        return null;
    } else if (populated) {
        order.service.availableParameters = filterActiveData(order.service.availableParameters);
        order.service.collectionTypes = filterActiveData(order.service.collectionTypes)
    }

    const parameters = order.parameters;
    const requiredUnits = order.unitsRequested;

    const serviceCost = await calculateServiceCost(service, requiredUnits, user);
    if (serviceCost === -1) {
        await removeOrder(order);
        return null;
    }

    const parameterCost = await calculateParameterCost(parameters, requiredUnits, service.availableParameters, populated);
    if (parameterCost === -1) {
        await removeOrder(order);
        return null;
    }

    order.parameterCost = parameterCost;
    order.serviceCost = serviceCost;
    order.totalCost = order.parameterCost + order.serviceCost;
    return order;
};

const validateOrder = async (orders, user, populated = false) => {

    if (orders instanceof Array) {
        let newOrders = [];

        for (let i = 0; i < orders.length; i++) {

            if (orders[i].status < orderStatus.placed) {
                const newOrder = await recalculateOrderCost(orders[i], user, populated);
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
            newOrder = await recalculateOrderCost(orders, user, populated);
        } else {
            newOrder = orders;
        }

        return newOrder;
    } else {
        return orders;
    }
};

const validateAddedOrder = async (cartId, service, unitsRequested) => {
    if (!cartId){
        return false;
    }
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
