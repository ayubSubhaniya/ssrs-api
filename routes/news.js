const router = require('express-promise-router')();
const passport = require('passport');

const passportConf = require('../passport');
const newsController = require('../controllers/news');
const { validateBody, validateParam, schemas } = require('../helpers/routeHelpers');

/* Code for further release
router.route('/my')
    .get(
        passport.authenticate('jwt', { session: false }),
        newsController.getNewsCreatedByMe
    )
    .delete(
        passport.authenticate('jwt', { session: false }),
        newsController.deleteNewsCreatedByMe
    );
*/
router.route('/:newsId')
    .get(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'newsId'),
        newsController.getNews
    )
    .patch(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'newsId'),
        newsController.updateNews
    )
    .delete(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'newsId'),
        newsController.deleteNews
    );

router.route('/')
    .get(
        passport.authenticate('jwt', { session: false }),
        newsController.getAllNews
    )
    .post(
        passport.authenticate('jwt', { session: false }),
        newsController.addNews
    )
    .delete(
        passport.authenticate('jwt', { session: false }),
        newsController.deleteAllNews
    );

module.exports = router;
