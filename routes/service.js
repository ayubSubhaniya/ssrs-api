const router = require('express-promise-router')();
const passport = require('passport');

const passportConf = require('../passport');
const serviceController = require('../controllers/service');
const { validateBody, validateParam, schemas } = require('../helpers/routeHelpers');

router.route('/')
    .get(
        passport.authenticate('jwt', { session: false }),
        serviceController.getAllServices
    )
    .post(
        passport.authenticate('jwt', { session: false }),
        validateBody(schemas.serviceSchema),
        serviceController.addService
    );

router.route('/special')
    .get(
        passport.authenticate('jwt', { session: false }),
        serviceController.getAllSpecialServices
    );

router.route('/special/:serviceId')
    .get(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'serviceId'),
        serviceController.getSpecialService
    );

router.route('/:serviceId')
    .get(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'serviceId'),
        serviceController.getService
    )
    .patch(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'serviceId'),
        validateBody(schemas.serviceUpdateSchema),
        serviceController.updateService
    )
    .delete(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'serviceId'),
        serviceController.deleteService
    );

module.exports = router;
