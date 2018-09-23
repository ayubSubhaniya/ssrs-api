const router = require('express-promise-router')();
const passport = require('passport');
const collectorController = require('../controllers/collector');
const { validateParam, validateBody, schemas } = require('../helpers/routeHelpers');

router.route('/')
    .get(
        passport.authenticate('jwt', { session: false }),
        collectorController.getCollectorByCollectionCode
    );

router.route('/:requestedCollectorId')
    .get(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'requestedCollectorId'),
        collectorController.getCollector
    );

module.exports = router;
