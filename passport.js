const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const { JWT_SECRET, validityErrors, userTypes, adminTypes } = require('./configuration');
const User = require('./models/user');
const UserInfo = require('./models/userInfo');

//JSON WEB TOKEN STRATEGY
passport.use(new JwtStrategy({
    jwtFromRequest: req => req.cookies.jwt,
    secretOrKey: JWT_SECRET,
    passReqToCallback: true
}, async (req, payload, done) => {
    try {
        //find the user specified in token
        const user = await User.findOne({ daiictId: payload.sub })
            .populate('userInfo');

        if (user.userType!=="superAdmin"){
            if (user.userInfo.user_type === "STUDENT"){
                user.userType = userTypes.student;
            } else{
                user.userType = adminTypes.admin;
            }
        }

        //user.userType = userInfo.user_type;

        //if user doesn't exist handle it
        if (!user) {
            return done(null, false, { message: validityErrors.invalidToken });
        }

        //token expired
        if (payload.exp < Date.now()) {
            return done(null, false, { message: validityErrors.sessionExpired });
        }
        req['user'] = user;
        //Otherwise, return the user
        done(null, user);
    } catch (error) {
        done(error, false);
    }
}));

//LOCAL STRATEGY
passport.use(new LocalStrategy({
    usernameField: 'daiictId',
}, async (daiictId, password, done) => {

    try {
        //find the user with given email
        const user = await User.findOne({ daiictId })
            .populate('userInfo');
        //if not handle it
        if (!user) {
            return done(null, false);
        }

        //check if the password is correct
        const isMatch = await user.isValid(password);

        //if not handle it
        if (!isMatch) {
            return done(null, false);
        }

        //otherwise return user
        done(null, user);
    } catch (error) {
        done(error, false);
    }
}));
