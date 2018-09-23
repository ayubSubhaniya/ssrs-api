const JWT = require(`jsonwebtoken`);
const HttpStatus = require('http-status-codes');
const nodemailer = require('nodemailer');
const randomstring = require('randomstring');
const bcrypt = require('bcryptjs');

const User = require('../models/user');
const tempUser = require('../models/tempUser');
const Cart = require('../models/cart');
const { httpProtocol, JWT_SECRET, JWT_EXPIRY_TIME, JWT_ISSUER, daiictMailDomainName, userTypes, resources, errors, cookiesName } = require('../configuration');
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
            subject: 'Please confirm your Email account',
            html: 'Hello,<br> Please Click on the link to verify your email.<br><a href=' + link + '>Click here to verify</a>',

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
        const resendVerificationLink = httpProtocol + '://' + host + '/account/resendVerificationLink/' + daiictId;
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
            html: 'Hello,<br> Please Click on the link to verify your email.<br><a href=' + link + '>Click here to verify</a>',

        };
        const resendVerificationLink = httpProtocol + '://' + host + '/account/resendVerificationLink/' + daiictId;
        const info = await smtpTransport.sendMail(mailOptions);

        res.status(HttpStatus.CREATED)
            .end('<h1>Verification link sent to email ' + primaryEmail + ' please verify your account</h1><br><a href=' + resendVerificationLink + '>Click here to resend verification link</a>');
    },


    verifyAccount: async (req, res, next) => {
        const { daiictId } = req.params;
        const user = await tempUser.findOne({ daiictId });

        if (req.query.id === user.randomHash) {
            //crete new Cart
            const cart = new Cart({
                requestedBy:daiictId,
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
            res.end('<h1>Email ' + user.daiictId + ' is been successfully verified</h1>');
        }
        else {
            res.end('<h1>Bad Request</h1>');
        }
    },

    changePassword: async (req, res, next) => {

        const { newPassword } = req.value.body;
        const { user } = req;
        const { daiictId } = user;
        console.log(newPassword);
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
        const permission = accessControl.can(user.userType)
            .readOwn(resources.user);

        const filteredUser = filterResourceData(user, permission.attributes);

        res.cookie(cookiesName.jwt, token, {
            httpOnly: false,
            expires: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        })
            .status(HttpStatus.OK)
            .json({ user: filteredUser });
    },

    signOut: async (req, res, next) => {
        res.clearCookie('jwt');
        res.status(HttpStatus.OK)
            .end();
    },
}
