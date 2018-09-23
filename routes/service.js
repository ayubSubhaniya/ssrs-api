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

router.route('/special/:service')
    .get(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'service'),
        serviceController.getSpecialService
    );

router.route('/changeStatus/:service')
    .patch(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'service'),
        validateBody(schemas.changeStatusSchema),
        serviceController.changeStatus
    );

router.route('/:service')
    .get(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'service'),
        serviceController.getService
    )
    .patch(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'service'),
        validateBody(schemas.serviceUpdateSchema),
        serviceController.updateService
    )
    .delete(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'service'),
        serviceController.deleteService
    );

module.exports = router;
