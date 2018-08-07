const HttpStatus = require('http-status-codes');

const Order = require('../models/order');
const Service = require('../models/service');
const User = require('../models/user');

module.exports = {
    getAllOrders: async (req, res, next) => {
        const orders = await Order.find({});
        res.status(200).json(orders);
    },

    getOrder: async (req, res, next) => {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);
        res.status(200).json(order);
    },

    addOrder: async (req, res, next) => {
        const { userId } = req.params;
        const user = await User.findById(userId);
        const order = req.body;
        order.requested_by = user._id;
        await order.save();
        res.status(200).json(order);
    },

    deleteOrder: async (req, res, next) => {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);
        const userId = order.requested_by;
        const user = await User.findById(userId);
        user.requestedServices.pull(order);
        await user.save();
        await Order.remove(order);
        res.status(200).json(order);
    },

    updateOrder: async (req, res, next) => {
        const { orderId } = req.params;
        const order = await Order.findByIdAndUpdate(orderId, req.body, {new:true});
        res.status(200).json(order);
    },
};
