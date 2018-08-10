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
            res.status(HttpStatus.CREATED).json({user:filteredUser});
        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    deleteUser: async (req, res, next) => {
        const {user} = req; 
        const { requestedUserId } = req.params;

        const deletePermission = accessControl.can(user.userType).deleteAny(resources.user);
        if (deletePermission.granted) {
            const deletedUser = await User.findOneAndRemove({daiictId:requestedUserId});

            if (deletedUser){
                res.sendStatus(HttpStatus.ACCEPTED);
            } else {
                res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
            }
            
        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    getUser: async (req, res, next) => {
        const {user} = req; 
        const { requestedUserId } = req.params;

        const readPermission = accessControl.can(user.userType).readAny(resources.user);
        if (readPermission.granted) {
            const requestedUser = await User.findOne({daiictId:requestedUserId});
            if (requestedUser){
                const filteredUser = filterResourceData(requestedUser,readPermission.attributes);
                res.status(HttpStatus.ACCEPTED).json({user:filteredUser});
            } else {
                res.sendStatus(HttpStatus.NOT_ACCEPTABLE);    
            }
            
        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    getAllUser: async (req, res, next) => {
        const {user} = req; 

        const readPermission = accessControl.can(user.userType).readAny(resources.user);
        if (readPermission.granted) {
            const requestedUsers = await User.find({});
            const filteredUsers = filterResourceData(requestedUsers,readPermission.attributes);
            res.status(HttpStatus.ACCEPTED).json({user:filteredUsers});
        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    updateUser: async (req, res, next) => {
        const {user} = req;
        const { requestedUserId } = req.params;

        const updatePermission = accessControl.can(user.userType).updateAny(resources.user);
        const readPermission = accessControl.can(user.userType).readAny(resources.user);
        if (updatePermission.granted) {
            const userUpdateAtt = req.value.body;
            const updatedUser = await User.findOneAndUpdate({daiictId:requestedUserId}, userUpdateAtt, {new:true});
            if (updatedUser){
                const filteredUser = filterResourceData(updatedUser,readPermission.attributes);
                res.status(HttpStatus.ACCEPTED).json({user:filteredUser});
            } else {
                res.sendStatus(HttpStatus.NOT_ACCEPTABLE);    
            }
            
        } else {
            res.sendStatus(HttpStatus.ACCEPTED);
        }
    },

};
