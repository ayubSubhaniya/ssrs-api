const router = require('express-promise-router')();
const passport = require('passport');
const passportConf = require('../passport');
const notificationController = require('../controllers/notification');
const { validateBody, schemas, validateParam } = require('../helpers/routeHelpers');

router.route('/')
    .get(
        passport.authenticate('jwt', { session: false }),
        notificationController.getAllNotification
    )
    .post(
        passport.authenticate('jwt', { session: false }),
        validateBody(schemas.notificationSchema),
        notificationController.addNotification
    )
    .delete(
        passport.authenticate('jwt', { session: false }),
        notificationController.deleteAllNotification
    );
router.route('/:notificationId')
    .get(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'notificationId'),
        notificationController.getNotification
    )
    /* for further release 
    .patch(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'notificationId'),
        validateBody(schemas.notificationUpdateSchema),
        notificationController.updateNotification
    ) */
    .delete(
        passport.authenticate('jwt', { session: false }),
        validateParam(schemas.idSchema, 'notificationId'),
        notificationController.deleteNotification
    );

module.exports = router;
