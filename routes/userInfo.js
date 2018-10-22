const router = require('express-promise-router')();
const passport = require('passport');

const userInfoController = require('../controllers/userInfo');
const { validateBody, schemas } = require('../helpers/routeHelpers');

router.route('/')
    .get(
        passport.authenticate('jwt', { session: false }),
        userInfoController.getAllUserInfo
    )
    .post(
        passport.authenticate('jwt', { session: false }),
        validateBody(schemas.addUserInfoSchema),
        userInfoController.addUpdateUserInfo
    );

router.route('/distinct')
    .get(
        passport.authenticate('jwt', { session: false }),
        userInfoController.getDistinctValues
    );
module.exports = router;
