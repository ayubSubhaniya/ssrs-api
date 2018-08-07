const HttpStatus = require('http-status-codes');

const User = require('../models/user');
const {resources, errors, userTypes, daiictMailDomainName} = require('../configuration');
const {accessControl} = require('./access')
const {filterResourceData} = require('../helpers/controllerHelpers')

module.exports = {

    addUser: async (req, res, next) => {
        const {user} = req; 

        const createPermission = accessControl.can(user.userType).createAny(resources.user);
        const readPermission = accessControl.can(user.userType).readAny(resources.user);
        if (createPermission.granted) {
            const { daiictId, password, userType } = req.value.body;
            const primaryEmail = daiictId + '@' + daiictMailDomainName;
            const createdOn = new Date();

            if (!userType){
                userType = userTypes.student;
            }

            const newUser = new User({
                daiictId,
                password,
                primaryEmail,
                userType,
                createdOn
            });

            const addedUser = await newUser.save();
            const filteredUser = filterResourceData(addedUser,readPermission.attributes);
            res.status(HttpStatus.CREATED).json(filteredUser);
        } else {
            res.status(HttpStatus.UNAUTHORIZED).json({error:errors.permissionDenied});
        }
    },

    deleteUser: async (req, res, next) => {
        const {user} = req; 
        const { requestedUserId } = req.params;

        const deletePermission = accessControl.can(user.userType).deleteAny(resources.user);
        if (deletePermission.granted) {
            const deletedUser = await User.findOneAndRemove({daiictId:requestedUserId});
            res.status(HttpStatus.ACCEPTED).json({success:true});
        } else {
            res.status(HttpStatus.UNAUTHORIZED).json({error:errors.permissionDenied});
        }
    },

    getUser: async (req, res, next) => {
        const {user} = req; 
        const { requestedUserId } = req.params;

        const readPermission = accessControl.can(user.userType).readAny(resources.user);
        if (readPermission.granted) {
            const requestedUser = await User.findOne({daiictId:requestedUserId});
            const filteredUser = filterResourceData(requestedUser,readPermission.attributes);
            res.status(HttpStatus.ACCEPTED).json(filteredUser);
        } else {
            res.status(HttpStatus.UNAUTHORIZED).json({error:errors.permissionDenied});
        }
    },

    getAllUser: async (req, res, next) => {
        const {user} = req; 

        const readPermission = accessControl.can(user.userType).readAny(resources.user);
        if (readPermission.granted) {
            const requestedUsers = await User.find({});
            const filteredUsers = filterResourceData(requestedUsers,readPermission.attributes);
            res.status(HttpStatus.ACCEPTED).json(filteredUsers);
        } else {
            res.status(HttpStatus.UNAUTHORIZED).json({error:errors.permissionDenied});
        }
    },

    replaceUser: async (req, res, next) => {
        const {user} = req; 
        const { requestedUserId } = req.params;

        const updatePermission = accessControl.can(user.userType).updateAny(resources.user);
        if (updatePermission.granted) {
            const newUser = req.body;
            const result = await User.replaceOne({daiictId:requestedUserId}, newUser, {new:true});
            res.status(HttpStatus.ACCEPTED).json({success:true});
        } else {
            res.status(HttpStatus.UNAUTHORIZED).json({error:errors.permissionDenied});
        }
    },

    updateUser: async (req, res, next) => {
        const {user} = req;
        const { requestedUserId } = req.params;

        const updatePermission = accessControl.can(user.userType).updateAny(resources.user);
        const readPermission = accessControl.can(user.userType).readAny(resources.user);
        if (updatePermission.granted) {
            const updatedUser = req.body;
            const result = await User.findOneAndUpdate({daiictId:requestedUserId}, updatedUser, {new:true});
            const filteredUser = filterResourceData(result,readPermission.attributes);
            res.status(HttpStatus.ACCEPTED).json(filteredUser);
        } else {
            res.status(HttpStatus.UNAUTHORIZED).json({error:errors.permissionDenied});
        }
    },

};
