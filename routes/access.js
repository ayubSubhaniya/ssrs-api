const router = require('express-promise-router')();
const passport = require('passport');
const passportConf = require('../passport');
const accessController = require('../controllers/access');
const { validateBody, schemas } = require('../helpers/routeHelpers');

router.route('/')
    .get(
        passport.authenticate('jwt', { session: false }),
        accessController.getAccessLevel
    )
    .post(
        passport.authenticate('jwt', { session: false }),
        accessController.addAccessLevel
    );

router.route('/roles')
    .get(
        passport.authenticate('jwt', { session: false }),
        accessController.getRoles
    )
    .post(
        passport.authenticate('jwt', { session: false }),
        accessController.addRoles
    )
    .delete(
        passport.authenticate('jwt', { session: false }),
        accessController.deleteRoles
    );
module.exports = router;
