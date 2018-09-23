const router = require('express-promise-router')();
const passport = require('passport');
const courierController = require('../controllers/courier');
const { validateParam, validateBody, schemas } = require('../helpers/routeHelpers');

router.route('/')
    .get(
        passport.authenticate('jwt', { session: false }),
        courierController.getAllCouriers
    );

router.route('/:requestedCourierId')
    .get(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'requestedCourierId'),
        courierController.getCourier
    );

module.exports = router;
