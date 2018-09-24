const HttpStatus = require('http-status-codes');

const User = require('../models/user');
const { resources, userTypes, daiictMailDomainName } = require('../configuration');
const { accessControl } = require('./access');
const { filterResourceData } = require('../helpers/controllerHelpers');

module.exports = {

    addUser: async (req, res, next) => {
        const { user } = req;

        const createPermission = accessControl.can(user.userType)
            .createAny(resources.user);
        const readPermission = accessControl.can(user.userType)
            .readAny(resources.user);

        if (createPermission.granted) {
            const { daiictId, password } = req.value.body;

            //check if user exist
            const foundUser = await User.findOne({ daiictId });

            //user already exist
            if (foundUser) {
                return res.sendStatus(HttpStatus.FORBIDDEN);
            }

            let { userType } = req.value.body;
            const primaryEmail = daiictId + '@' + daiictMailDomainName;
            const createdOn = new Date();

            if (!userType) {
                userType = userTypes.student;
            }

            const newUser = new User({
                daiictId,
                password,
                primaryEmail,
                userType,
                createdOn
            });

            /**
             * Add instruction for sending mail to new user
             */

            const addedUser = await newUser.save();
            const filteredUser = filterResourceData(addedUser, readPermission.attributes);
            res.status(HttpStatus.CREATED)
                .json({ user: filteredUser });
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    getUser: async (req, res, next) => {
        const { user } = req;

        const readPermission = accessControl.can(user.userType)
            .readOwn(resources.user);

        if (readPermission.granted) {
            const filteredUser = filterResourceData(user, readPermission.attributes);
            res.status(HttpStatus.OK)
                .json({ user: filteredUser });
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    getOtherUser: async (req, res, next) => {
        const { user } = req;
        const { requestedUserId } = req.params;

        const readPermission = accessControl.can(user.userType)
            .readAny(resources.user);

        if (readPermission.granted) {
            const requestedUser = await User.findOne({ daiictId: requestedUserId });

            if (requestedUser) {
                const filteredUser = filterResourceData(requestedUser, readPermission.attributes);
                res.status(HttpStatus.OK)
                    .json({ user: filteredUser });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }

        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    getAllUser: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;

        const readPermission = accessControl.can(user.userType)
            .readAny(resources.user);

        if (readPermission.granted) {
            const requestedUsers = await User.find({
                daiictId: {
                    $nin: [daiictId]
                }
            });
            const filteredUsers = filterResourceData(requestedUsers, readPermission.attributes);
            res.status(HttpStatus.OK)
                .json({ user: filteredUsers });
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    updateOtherUser: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { requestedUserId } = req.params;

        const updatePermission = accessControl.can(user.userType)
            .updateAny(resources.user);
        const readPermission = accessControl.can(user.userType)
            .readAny(resources.user);

        /* A user cannot change its own user-type */
        if (daiictId === requestedUserId) {
            return res.sendStatus(HttpStatus.BAD_REQUEST);
        }

        if (updatePermission.granted) {
            const userUpdateAtt = req.value.body;
            const updatedUser = await User.findOneAndUpdate({ daiictId: requestedUserId }, userUpdateAtt, { new: true });
            if (updatedUser) {
                const filteredUser = filterResourceData(updatedUser, readPermission.attributes);
                res.status(HttpStatus.OK)
                    .json({ user: filteredUser });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }

        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    updateUser: async (req, res, next) => {
        const { user } = req;
        const requestedUserId = user.daiictId;

        const updatePermission = accessControl.can(user.userType)
            .updateOwn(resources.user);
        const readPermission = accessControl.can(user.userType)
            .readOwn(resources.user);

        if (updatePermission.granted) {
            const userUpdateAtt = req.value.body;
            const updatedUser = await User.findOneAndUpdate({ daiictId: requestedUserId }, userUpdateAtt, { new: true });
            if (updatedUser) {
                const filteredUser = filterResourceData(updatedUser, readPermission.attributes);
                res.status(HttpStatus.OK)
                    .json({ user: filteredUser });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }

        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    deleteUser: async (req, res, next) => {
        const { user } = req;
        const { requestedUserId } = req.params;

        const deletePermission = accessControl.can(user.userType)
            .deleteAny(resources.user);

        if (deletePermission.granted) {
            const deletedUser = await User.findOneAndRemove({ daiictId: requestedUserId });

            res.sendStatus(HttpStatus.OK);
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    changeStatus: async (req, res, next) => {
        const { user } = req;
        const { requestedUserId } = req.params;

        const updatePermission = accessControl.can(user.userType)
            .updateAny(resources.changeResourceStatus);
        const readPermission = accessControl.can(user.userType)
            .readAny(resources.user);

        if (updatePermission.granted) {
            const userUpdateAtt = req.value.body;
            const updatedUser = await User.findOneAndUpdate({ daiictId: requestedUserId }, userUpdateAtt, { new: true });
            if (updatedUser) {
                const filteredUser = filterResourceData(updatedUser, readPermission.attributes);
                res.status(HttpStatus.OK)
                    .json({ user: filteredUser });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

};
