const router = require('express-promise-router')();
const passport = require('passport');

const passportConf = require('../passport');
const cartController = require('../controllers/cart');
const { validateBody, validateParam, schemas } = require('../helpers/routeHelpers');

router.route('/')
    .get(
        passport.authenticate('jwt', { session: false }),
        cartController.getMyCart
    );

router.route('/all')
    .get(
        passport.authenticate('jwt', { session: false }),
        cartController.getAllCart
    );

router.route('/courier/')
    .post(
        passport.authenticate('jwt', { session: false }),
        validateBody(schemas.addCourierSchema),
        cartController.addCourier
    )
    .patch(
        passport.authenticate('jwt', { session: false }),
        validateBody(schemas.updateCourierSchema),
        cartController.updateCourier
    );

router.route('/pickup/')
    .post(
        passport.authenticate('jwt', { session: false }),
        validateBody(schemas.addPickupSchema),
        cartController.addPickup
    )
    .patch(
        passport.authenticate('jwt', { session: false }),
        validateBody(schemas.updatePickupSchema),
        cartController.updatePickup
    );

router.route('/addPayment/')
    .patch(
        passport.authenticate('jwt', { session: false }),
        validateBody(schemas.addPaymentSchema),
        cartController.addPayment
    );

router.route('/acceptPayment/:paymentCode')
    .patch(
        passport.authenticate('jwt', { session: false }),
        cartController.acceptPayment
    );

router.route('/changeStatus/:cartId')
    .patch(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'cartId'),
        validateBody(schemas.changeCartStatusSchema),
        cartController.changeStatus
    );

router.route('/cancelCart/:cartId')
    .patch(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'cartId'),
        validateBody(schemas.cancelSchema),
        cartController.cancelCart
    );

router.route('/:cartId')
    .get(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'cartId'),
        cartController.getCart
    );

module.exports = router;
