const JWT = require(`jsonwebtoken`);
const HttpStatus = require('http-status-codes');
const User = require('../models/user');
const News = require('../models/news');
const Notification = require('../models/notification');
const { JWT_SECRET, JWT_EXPIRY_TIME, JWT_ISSUER, daiictMailDomainName, userTypes, resources, fieldName, errors, adminTypes, cookiesName } = require('../configuration');
const { accessControl } = require('./access');
const { filterResourceData } = require('../helpers/controllerHelpers')

//sign a new token
signToken = user => {
    return JWT.sign({
        iss: JWT_ISSUER,
        sub: user.daiictId,
        iat: new Date().getTime(),
        exp: new Date().setDate(new Date().getDate() + JWT_EXPIRY_TIME),
    }, JWT_SECRET);
};

module.exports = {
    signUp: async (req, res, next) => {

        const { daiictId, password } = req.value.body;
        const primaryEmail = daiictId + '@' + daiictMailDomainName;
        const createdOn = new Date();
        //check if user exist
        const foundUser = await User.findOne({ daiictId });

        //user already exist
        if (foundUser) {
            return res.status(HttpStatus.FORBIDDEN).json({ error: errors.accountAlreadyExists });
        }

        //create new user
        const newUser = new User({
            daiictId,
            primaryEmail,
            password,
            createdOn
        });
        var savedUser = await newUser.save();

        //generate token
        const token = signToken(newUser);
        const readPermission = accessControl.can(userTypes.student).readOwn(resources.user);

        var filteredUser = filterResourceData(savedUser, readPermission.attributes)

        res.cookie(cookiesName.jwt, token,{
            httpOnly:true,
            expires: new Date(Date.now()+15 * 24 * 60 * 60 * 1000),
        }).status(HttpStatus.CREATED).json({ user:filteredUser });
    },

    signIn: async (req, res, next) => {

        //sign token
        const token = signToken(req.value.body);

        //get User Id
        const {user} = req;
        const permission = accessControl.can(user.userType).readOwn(resources.user);

        var filteredUser = filterResourceData(user, permission.attributes)

        res.cookie(cookiesName.jwt, token,{
            httpOnly:true,
            expires: new Date(Date.now()+15 * 24 * 60 * 60 * 1000),
        }).status(HttpStatus.ACCEPTED).json({ user:filteredUser });
    },

    signOut: async (req, res, next) => {
        res.clearCookie("jwt");
        res.status(HttpStatus.OK).end();
    },

    updateInformation: async (req, res, next) => {
        //sign token
        const user = req.value.body;

        const userInDB = req.user;

        const permission = accessControl.can(userTypes.student).readOwn(resources.user);
        const editableField = permission.attributes;
        const fieldsToUpdate = Object.keys(user);

        for (let i = 0; i < fieldsToUpdate.length; i++) {
            if (!editableField.includes(fieldsToUpdate[i])) {
                if (userInDB[fieldsToUpdate[i]] != user[fieldsToUpdate[i]]) {
                    permission.granted=false;
                    break;
                }
            }
        }

        if (permission.granted) {
            const savedUser = await User.findByIdAndUpdate(userInDB._id, user);

            var filteredUser = filterResourceData(savedUser, permission.attributes)

            res.status(HttpStatus.ACCEPTED).json({ user:filteredUser });
        } else {
            res.status(HttpStatus.UNAUTHORIZED).json({ error: errors.permissionDenied });
        }
    },

}