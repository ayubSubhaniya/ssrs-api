const HttpStatus = require('http-status-codes');

const CollectionType = require('../models/collectionType');
const News = require('../models/news');
const { resources } = require('../configuration');
const { accessControl } = require('./access');
const { filterResourceData } = require('../helpers/controllerHelpers');

module.exports = {

    addCollectionType: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;

        const createPermission = accessControl.can(user.userType)
            .createOwn(resources.collectionType);
        const readPermission = accessControl.can(user.userType)
            .readAny(resources.collectionType);

        if (createPermission.granted) {
            let collectionTypeAtt = req.value.body;
            collectionTypeAtt.createdOn = new Date();
            collectionTypeAtt.createdBy = daiictId;

            const newCollectionType = new CollectionType(collectionTypeAtt);
            const collectionType = await newCollectionType.save();

            const filteredCollectionType = filterResourceData(collectionType, readPermission.attributes);
            res.status(HttpStatus.CREATED)
                .json({ collectionType: filteredCollectionType });
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    deleteCollectionType: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { requestedCollectionTypeId } = req.params;

        const deleteAnyPermission = accessControl.can(user.userType)
            .deleteAny(resources.collectionType);
        const deleteOwnPermission = accessControl.can(user.userType)
            .deleteOwn(resources.collectionType);


        if (deleteAnyPermission.granted) {

            await CollectionType.findByIdAndRemove(requestedCollectionTypeId);
            res.status(HttpStatus.OK)
                .json({});
        } else if (deleteOwnPermission.granted) {

            const deletedCollectionType = await CollectionType.findOneAndRemove({
                _id: requestedCollectionTypeId,
                createdBy: daiictId
            });

            if (deletedCollectionType) {
                res.status(HttpStatus.OK)
                    .json({});
            } else {
                res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
            }
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    getCollectionType: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { requestedCollectionTypeId } = req.params;

        const readPermission = accessControl.can(user.userType)
            .readAny(resources.collectionType);
        const readAnyInActiveResource = accessControl.can(user.userType)
            .readAny(resources.inActiveResource);
        const readOwnInActiveResource = accessControl.can(user.userType)
            .readOwn(resources.inActiveResource);

        if (readPermission.granted) {
            let requestedCollectionType;

            if (readAnyInActiveResource.granted) {
                requestedCollectionType = await CollectionType.findById(requestedCollectionTypeId);
            } else if (readOwnInActiveResource.granted) {
                requestedCollectionType = await CollectionType.findOne({
                    _id: requestedCollectionTypeId,
                    $or: [{ createdBy: daiictId }, { isActive: true }]
                });
            } else {
                requestedCollectionType = await CollectionType.findOne({
                    _id: requestedCollectionTypeId,
                    isActive: true
                });
            }

            if (requestedCollectionType) {
                const filteredCollectionType = filterResourceData(requestedCollectionType, readPermission.attributes);
                res.status(HttpStatus.OK)
                    .json({ collectionType: filteredCollectionType });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }

        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    getAllCollectionType: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;

        const readPermission = accessControl.can(user.userType)
            .readAny(resources.collectionType);
        const readAnyInActiveResource = accessControl.can(user.userType)
            .readAny(resources.inActiveResource);
        const readOwnInActiveResource = accessControl.can(user.userType)
            .readOwn(resources.inActiveResource);

        if (readPermission.granted) {
            let requestedCollectionTypes;

            if (readAnyInActiveResource.granted) {
                requestedCollectionTypes = await CollectionType.find({});
            } else if (readOwnInActiveResource.granted) {
                requestedCollectionTypes = await CollectionType.find({ $or: [{ createdBy: daiictId }, { isActive: true }] });
            } else {
                requestedCollectionTypes = await CollectionType.find({ isActive: true });
            }

            if (requestedCollectionTypes) {
                const filteredCollectionTypes = filterResourceData(requestedCollectionTypes, readPermission.attributes);
                res.status(HttpStatus.OK)
                    .json({ collectionType: filteredCollectionTypes });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }

        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    changeStatus: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { collectionTypeId } = req.params;

        const changeStatusPermission = accessControl.can(user.userType)
            .updateOwn(resources.changeResourceStatus);
        const readPermission = accessControl.can(user.userType)
            .readAny(resources.collectionType);

        if (changeStatusPermission.granted) {
            const collectionTypeUpdateAtt = req.value.body;
            const updatedCollectionType = await CollectionType.findByIdAndUpdate(collectionTypeId, collectionTypeUpdateAtt, { new: true });

            if (updatedCollectionType) {
                const message = 'Collection type ' + updatedCollectionType.name + ' is now '
                    + (updatedCollectionType.isActive ? 'active' : 'inactive');
                const news = new News({
                    message,
                    createdOn: new Date(),
                    createdBy: daiictId,
                });
                await news.save();

                const filteredCollectionType = filterResourceData(updatedCollectionType, readPermission.attributes);
                res.status(HttpStatus.OK)
                    .json({ collectionType: filteredCollectionType });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    /**Add inactive no-update support */
    updateCollectionType: async (req, res, next) => {
        const { user } = req;
        const { requestedCollectionTypeId } = req.params;

        const updatePermission = accessControl.can(user.userType)
            .updateOwn(resources.collectionType);
        const readPermission = accessControl.can(user.userType)
            .readAny(resources.collectionType);

        if (updatePermission.granted) {
            const updatedCollectionType = req.value.body;
            const modifiedCollectionType = await CollectionType.findByIdAndUpdate(requestedCollectionTypeId, updatedCollectionType, { new: true });
            const filteredCollectionType = filterResourceData(modifiedCollectionType, readPermission.attributes);
            res.status(HttpStatus.OK)
                .json({ collectionType: filteredCollectionType });

        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

};
