const router = require('express-promise-router')();
const passport = require('passport');
const userController = require('../controllers/user');
const { validateBody, schemas } = require('../helpers/routeHelpers');

router.route('/')
    .post(
        passport.authenticate('jwt', { session: false }),
        validateBody(schemas.addUserSchema),
        userController.addUser
    );

router.route('/all')
    .get(
        passport.authenticate('jwt', { session: false }),
        userController.getAllUser
    );

router.route('/:requestedUserId')
    .get(
        passport.authenticate('jwt', { session: false }),
        userController.getUser
    )
    .patch(
        passport.authenticate('jwt', { session: false }),
        validateBody(schemas.updateUserSchema),
        userController.updateUser
    )
    .delete(
        passport.authenticate('jwt', { session: false }),
        userController.deleteUser
    );

module.exports = router;
