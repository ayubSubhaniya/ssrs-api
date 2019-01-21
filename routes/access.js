const router = require('express-promise-router')();
const passport = require('passport');
const passportConf = require('../passport');
const accessController = require('../controllers/access');
const { validateBody, schemas } = require('../helpers/routeHelpers');

router.route('/roles')
    .get(
        passport.authenticate('jwt', { session: false }),
        accessController.getRoles
    )
    .post(
        passport.authenticate('jwt', { session: false }),
        accessController.addRole
    )
    .delete(
        passport.authenticate('jwt', { session: false }),
        accessController.deleteRoles
    );
router.route('/:role')
    .get(
        passport.authenticate('jwt', { session: false }),
        accessController.getAccessLevel
    )
    .post(
        passport.authenticate('jwt', { session: false }),
        accessController.addAccessLevel
    );

module.exports = router;
