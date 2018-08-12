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
        orderController.addOrder
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
        orderController.updateOrder
    );

router.route('/:orderId/parameters')
    .patch(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'orderId'),
        orderController.updateParameter
    );

router.route('/:orderId/courier')
    .post(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'orderId'),
        orderController.addCourier
    )
    .patch(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'orderId'),
        orderController.updateCourier
    );

router.route('/:orderId/pickup')
    .post(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'orderId'),
        orderController.addPickup
    )
    .patch(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'orderId'),
        orderController.updatePickup
    );

module.exports = router;
