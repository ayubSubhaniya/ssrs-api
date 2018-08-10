const router = require('express-promise-router')();
const passport = require('passport');
const passportConf = require('../passport');
const AccountController = require('../controllers/account');
const {validateBody, schemas} = require('../helpers/routeHelpers');

router.route('/signup')
    .post(
        validateBody(schemas.authSchema),
        AccountController.signUp
    );

router.route('/verify/:daiictId')
    .get(
        AccountController.verifyAccount
    )

router.route('/signin')
    .post(
        validateBody(schemas.authSchema),
        passport.authenticate('local',{session: false}),
        AccountController.signIn
    );

router.route('/signout')
    .get(
        passport.authenticate('jwt',{session: false}),
        AccountController.signOut
    );

router.route('/update')
    .post(
        passport.authenticate('jwt',{session: false}),
        validateBody(schemas.updateUserSchema),
        AccountController.updateInformation
    );
module.exports = router;