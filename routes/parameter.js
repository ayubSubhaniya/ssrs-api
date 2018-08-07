const router = require('express-promise-router')();
const passport = require('passport');
const parameterController = require('../controllers/parameter');
const {validateParam , validateBody, schemas} = require('../helpers/routeHelpers');

router.route('/')
    .get(
        passport.authenticate('jwt',{session:false}),
        parameterController.getAllParameter
    )
    .post(
        passport.authenticate('jwt',{session:false}),
        validateBody(schemas.parameterSchema),
        parameterController.addParameter
    );


router.route('/:requestedParameterId')
    .get(
        passport.authenticate('jwt',{session:false}),
        parameterController.getParameter
    )
    .delete(
        passport.authenticate('jwt',{session:false}),
        parameterController.deleteParameter
    )
    .put(
        passport.authenticate('jwt',{session:false}),
        validateBody(schemas.parameterUpdateSchema),
        parameterController.updateParameter
    );

module.exports = router;

