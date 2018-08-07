const express = require('express');
const router = require('express-promise-router')();

const orderController = require('../controllers/order');

router.route('/')
    .get(orderController.getAllOrders);

router.route('/:orderId')
    .get(orderController.getOrder)
    .put(orderController.addOrder)
    .delete(orderController.deleteOrder)
    .patch(orderController.updateOrder);

module.exports = router;
