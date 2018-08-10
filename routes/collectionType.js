const router = require('express-promise-router')();
const passport = require('passport');
const collectionTypeController = require('../controllers/collectionType');
const {validateParam , validateBody, schemas} = require('../helpers/routeHelpers');

router.route('/')
    .get(
        passport.authenticate('jwt',{session:false}),
        collectionTypeController.getAllCollectionType
    )
    .post(
        passport.authenticate('jwt',{session:false}),
        validateBody(schemas.collectionTypeSchema),
        collectionTypeController.addCollectionType
    );


router.route('/:requestedCollectionTypeId')
    .get(
        passport.authenticate('jwt',{session:false}),
        validateParam(schemas.idSchema,'requestedCollectionTypeId'),
        collectionTypeController.getCollectionType
    )
    .delete(
        passport.authenticate('jwt',{session:false}),
        validateParam(schemas.idSchema,'requestedCollectionTypeId'),
        collectionTypeController.deleteCollectionType
    )
    .patch(
        passport.authenticate('jwt',{session:false}),
        validateParam(schemas.idSchema,'requestedCollectionTypeId'),
        validateBody(schemas.collectionTypeUpdateSchema),
        collectionTypeController.updateCollectionType
    );

module.exports = router;

