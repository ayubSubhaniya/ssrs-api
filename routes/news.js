const express = require('express');
const router = require('express-promise-router')();
const passport = require('passport');
const HttpStatus = require('http-status-codes');

const passportConf = require('../passport');
const newsController = require('../controllers/news');
const {validateBody, schemas} = require('../helpers/routeHelpers');

router.route('/my')
    .get(
        passport.authenticate('jwt',{session: false}),
        newsController.getNewsCreatedByMe
    )
    .delete(
        passport.authenticate('jwt',{session: false}),
        newsController.deleteNewsCreatedByMe
    );

router.route('/:newsId')
    .get(
        passport.authenticate('jwt',{session: false}),
        newsController.getNews
    )
    .put(
        passport.authenticate('jwt',{session: false}),
        newsController.replaceNews
    )
    .patch(
        passport.authenticate('jwt',{session: false}),
        newsController.updateNews
    )
    .delete(
        passport.authenticate('jwt',{session: false}),
        newsController.deleteNews
    );

router.route('/')
    .get(
        passport.authenticate('jwt',{session: false}),
        newsController.getAllNews
    )
    .post(
        passport.authenticate('jwt',{session: false}),
        newsController.addNews
    )
    .delete(
        passport.authenticate('jwt',{session: false}),
        newsController.deleteAllNews
    );

module.exports = router;
