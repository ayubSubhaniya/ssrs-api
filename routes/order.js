const router = require('express-promise-router')();
const passport = require('passport');

const passportConf = require('../passport');
const orderController = require('../controllers/order');
const { validateBody, validateParam, schemas } = require('../helpers/routeHelpers');

router.route('/')
    .get(
        passport.authenticate('jwt', { session: false }),
        orderController.getAllOrders
    )
    .post(
        passport.authenticate('jwt', { session: false }),
        validateBody(schemas.addOrderSchema),
        orderController.addOrder
    );

router.route('/changeStatus/:orderId')
    .patch(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'orderId'),
        validateBody(schemas.changeOrderStatusSchema),
        orderController.changeStatus
    );

router.route('/:orderId')
    .get(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'orderId'),
        orderController.getOrder
    )
    .delete(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'orderId'),
        orderController.deleteOrder
    )
    .patch(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'orderId'),
        validateBody(schemas.updateOrderSchema),
        orderController.updateOrder
    );

module.exports = router;
