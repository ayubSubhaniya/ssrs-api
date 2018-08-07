const express = require('express');
const router = require('express-promise-router')();
const passport = require('passport');
const passportConf = require('../passport');
const notificationController = require('../controllers/notification');
const {validateBody, schemas} = require('../helpers/routeHelpers');

router.route('/')
    .get(
        passport.authenticate('jwt',{session: false}),
        notificationController.getAllNotification
    
    )
    .post(
        passport.authenticate('jwt',{session: false}),
        notificationController.addNotification
    
    )
    .delete(
        passport.authenticate('jwt',{session: false}),
        notificationController.deleteAllNotification
    
    );
router.route('/:notificationId')
    .get(
        passport.authenticate('jwt',{session: false}),
        notificationController.getNotification
    
    )
    .put(
        passport.authenticate('jwt',{session: false}),
        notificationController.replaceNotification
    
    )
    .patch(
        passport.authenticate('jwt',{session: false}),
        notificationController.updateNotification
    
    )
    .delete(
        passport.authenticate('jwt',{session: false}),
        notificationController.deleteNotification
    
    );

module.exports = router;
