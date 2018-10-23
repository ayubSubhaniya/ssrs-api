const router = require('express-promise-router')();
const passport = require('passport');
const passportConf = require('../passport');
const DashboardController = require('../controllers/dashboard');
const { validateBody, schemas } = require('../helpers/routeHelpers');

router.route('/cart')
    .get(
        passport.authenticate('jwt', { session: false }),
        DashboardController.getCartDetails
    );


module.exports = router;
