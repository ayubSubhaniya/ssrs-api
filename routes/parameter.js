const router = require('express-promise-router')();
const passport = require('passport');
const passportConf = require('../passport');
const parameterController = require('../controllers/parameter');
const { validateParam, validateBody, schemas } = require('../helpers/routeHelpers');

router.route('/')
    .get(
        passport.authenticate('jwt', { session: false }),
        parameterController.getAllParameter
    )
    .post(
        passport.authenticate('jwt', { session: false }),
        validateBody(schemas.parameterSchema),
        parameterController.addParameter
    );

router.route('/changeStatus/:parameterId')
    .patch(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'parameterId'),
        validateBody(schemas.changeStatusSchema),
        parameterController.changeStatus
    );


router.route('/:requestedParameterId')
    .get(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'requestedParameterId'),
        parameterController.getParameter
    )
    .delete(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'requestedParameterId'),
        parameterController.deleteParameter
    )
    .patch(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'requestedParameterId'),
        validateBody(schemas.parameterUpdateSchema),
        parameterController.updateParameter
    );

module.exports = router;

