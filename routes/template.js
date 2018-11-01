const router = require('express-promise-router')();
const passport = require('passport');
const templateController = require('../controllers/template.js');
const { validateBody, schemas } = require('../helpers/routeHelpers');

router.route('/email')
    .get(
        passport.authenticate('jwt', { session: false }),
        templateController.getAllEmailTemplates
    );

router.route('/email/:templateKey')
    .patch(
        passport.authenticate('jwt', { session: false }),
        validateBody(schemas.editEmailTemplate),
        templateController.editEmailTemplate
    );

module.exports = router;
