const JWT = require(`jsonwebtoken`);
const HttpStatus = require('http-status-codes');
const nodemailer = require('nodemailer');
const randomstring = require('randomstring');
const bcrypt = require('bcryptjs');

const User = require('../models/user');
const tempUser = require('../models/tempUser');
const Cart = require('../models/cart');
const { httpProtocol, JWT_SECRET, JWT_EXPIRY_TIME, JWT_ISSUER, RESET_PASSWORD_EXPIRY_TIME, daiictMailDomainName, userTypes, resources, cookiesName } = require('../configuration');
const errorMessages = require('../configuration/errors');
const { accessControl } = require('./access');
const { filterResourceData } = require('../helpers/controllerHelpers');

const mailAccountUserName = process.env.MAIL_USER;
const mailAccountPassword = process.env.MAIL_PASS;

/*
    Here we are configuring our SMTP Server details.
    STMP is mail server which is responsible for sending and recieving email.
*/
const smtpTransport = nodemailer.createTransport({
    host: 'webmail.daiict.ac.in',
    port: 465,
    secureConnection: true,
    auth: {
        user: mailAccountUserName,
        pass: mailAccountPassword
    },
    tls: {
        rejectUnauthorized: false
    },
});
/*------------------SMTP Over-----------------------------*/

const hashPassword = async (password) => {
    //generate a salt
    const salt = await bcrypt.genSalt();
    //generate password hash
    const passwordHashed = await bcrypt.hash(password, salt);
    //reassign hashed password
    return passwordHashed;
};

//sign a new token
const signToken = user => {
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
            return res.sendStatus(HttpStatus.FORBIDDEN);
        }

        const randomHash = randomstring.generate();
        const host = req.get('host');
        const link = httpProtocol + '://' + host + '/account/verify/' + daiictId + '?id=' + randomHash;
        const mailOptions = {
            from: mailAccountUserName,
            to: primaryEmail,
            subject: 'Verify your Email account',
            html: 'Welcome to Student Service Request System - DAIICT!' +
                '<br><br> Please click on the below mentioned link to verify your email.' +
                '<br><a href=' + link + '>Click here to verify</a>',

        };


        //create new temp user
        const newUser = {
            daiictId,
            primaryEmail,
            password: await hashPassword(password),
            createdOn,
            randomHash
        };
        const savedUser = await tempUser.findOneAndUpdate({ daiictId }, newUser, { upsert: true });
        const info = await smtpTransport.sendMail(mailOptions);

        res.status(HttpStatus.CREATED)
            .end('Response: Verification link sent');


    },

    resendVerificationLink: async (req, res, next) => {
        const { daiictId } = req.params;
        const user = await tempUser.findOne({ daiictId });
        const primaryEmail = daiictId + '@' + daiictMailDomainName;
        const host = req.get('host');
        const link = httpProtocol + '://' + host + '/account/verify/' + daiictId + '?id=' + user.randomHash;
        const mailOptions = {
            from: mailAccountUserName,
            to: primaryEmail,
            subject: 'Please confirm your Email account',
            html: 'Welcome to Student Service Request System - DAIICT!' +
                '<br><br> Please click on the below mentioned link to verify your email.' +
                '<br><a href=' + link + '>Click here to verify</a>'

        };
        const resendVerificationLink = httpProtocol + '://' + host + '/account/resendVerificationLink/' + daiictId;
        const info = await smtpTransport.sendMail(mailOptions);

        res.status(HttpStatus.CREATED)
            .end('<h1>Verification link sent to email ' + primaryEmail + ' please verify your account</h1><br><a href=' + resendVerificationLink + '>Click here to resend verification link</a>');
    },

    forgetPassword: async (req, res, next) => {
        const { daiictId } = req.params;
        const primaryEmail = daiictId + '@' + daiictMailDomainName;

        //check if user exist
        const foundUser = await User.findOne({ daiictId });

        const randomHash = randomstring.generate();
        const linkExpiryTime = new Date();
        linkExpiryTime.setHours(linkExpiryTime.getHours() + RESET_PASSWORD_EXPIRY_TIME);

        const host = req.get('host');
        const link = httpProtocol + '://' + host + '/account/resetPassword/' + daiictId + '?id=' + randomHash;
        const mailOptions = {
            from: mailAccountUserName,
            to: primaryEmail,
            subject: 'Password Reset Link',
            html: 'Hello,<br> Please click on the link below to reset your password.<br><a href=' + link + '>Click here to reset password</a>',

        };
        foundUser.resetPasswordToken = randomHash;
        foundUser.resetPasswordExpires = linkExpiryTime;
        await foundUser.save();
        const info = await smtpTransport.sendMail(mailOptions);

        res.status(HttpStatus.OK)
            .end('Response: Password reset link sent');
    },

    verifyResetPasswordLink: async (req, res, next) => {
        const { daiictId } = req.params;
        const user = await User.findOne({daiictId});
        //user already exist
        if (!user || user.resetPasswordToken!==req.query.id || user.resetPasswordExpires<new Date()) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgot');
        }

        res.render('reset', {
            user: req.user
        });
    },

    resetPassword: async (req, res, next) => {
        const { daiictId } = req.params;
        const primaryEmail = daiictId + '@' + daiictMailDomainName;
        const user = await User.findOne({daiictId});

        if (!user || user.resetPasswordToken!==req.query.id || user.resetPasswordExpires<new Date()) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/');
        }

        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('back');
        }
        user.password = await hashPassword(req.body.password);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        const mailOptions = {
            from: mailAccountUserName,
            to: primaryEmail,
            subject: 'Password successfully changed',
            text: 'Hello,\n' +
                '\tThis is a confirmation mail for successful change in password for your account ' + user.email + '.\n',

        };
        const info = await smtpTransport.sendMail(mailOptions);
    },


    verifyAccount: async (req, res, next) => {
        const { daiictId } = req.params;
        const user = await tempUser.findOne({ daiictId });

        if (req.query.id === user.randomHash) {
            //crete new Cart
            const cart = new Cart({
                requestedBy: daiictId,
                createdOn: user.createdOn,
            });
            await cart.save();
            //create new user
            const newUser = new User({
                daiictId: user.daiictId,
                primaryEmail: user.primaryEmail,
                password: user.password,
                createdOn: user.createdOn,
                cartId: cart._id
            });
            const savedUser = await newUser.save();
            await tempUser.findByIdAndRemove(user._id);
            res.end('<h2>Email for ' + user.daiictId + ' has been successfully verified!</h2>');
        }
        else {
            res.end('<h2>Bad Request</h2>');
        }
    },

    changePassword: async (req, res, next) => {

        const { newPassword } = req.value.body;
        const { user } = req;
        const { daiictId } = user;

        const newUser = await User.findOneAndUpdate({ daiictId }, { password: await hashPassword(newPassword) }, { new: true });

        res.sendStatus(HttpStatus.OK);
    }
    ,

    signIn: async (req, res, next) => {

        //sign token
        const userAtt = req.value.body;
        const token = signToken(userAtt);

        //get User Id
        const { user } = req;
        if (user.resetPasswordToken !== undefined) {
            user.resetPasswordRandomHash = undefined;
            await user.save();
        }
        const permission = accessControl.can(user.userType)
            .readOwn(resources.user);

        const filteredUser = filterResourceData(user, permission.attributes);

        res.cookie(cookiesName.jwt, token, {
            httpOnly: false,
            expires: new Date(Date.now() + JWT_EXPIRY_TIME * 24 * 60 * 60 * 1000),
        })
            .status(HttpStatus.OK)
            .json({ user: filteredUser });
    },

    signOut: async (req, res, next) => {
        res.clearCookie('jwt');
        res.status(HttpStatus.OK)
            .end();
    },
};
