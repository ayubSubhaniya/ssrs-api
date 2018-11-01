const express = require('express');
const morgan = require('morgan');
const db = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const HttpStatus = require('http-status-codes');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const rfs = require('rotating-file-stream');
const favicon = require('static-favicon');
const flash = require('express-flash');
const session = require('express-session');
const Sentry = require('@sentry/node');
const winston = require('winston');
const internetAvailable = require('internet-available');
//const https = require("https");

let isInternetAvaliable = false;
internetAvailable()
    .then(function () {
        isInternetAvaliable = true;
        console.log('Internet available');
    })
    .catch(function () {
        isInternetAvaliable = false;
        console.log('No internet');
    });

if (isInternetAvaliable) {
    Sentry.init({ dsn: 'https://7d739cca183145e6b0c99c3413daf8ec@sentry.io/1291244' });
}

const app = express();

if (app.get('env') === 'development') {
    const dotenv = require('dotenv');

    const { error } = dotenv.config();
    if (error) {
        throw error('Please add .env file');
    }
}

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        //
        // - Write to all logs with level `info` and below to `combined.log`
        // - Write all logs error (and below) to `error.log`.
        //
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error'
        }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

const logDirectory = path.join(__dirname, 'logs');

// ensure log directory exists
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

// create a rotating write stream
const accessLogStream = rfs('access.log', {
    interval: '1d', // rotate daily
    path: logDirectory
});


/* CONNECTING TO MongoDB */

/* Local Database */
/*const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT;
const DB_COLLECTION_NAME = process.env.DB_COLLECTION_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;

const dbURI = 'mongodb://ssrsDaiict:ssrsDaiict123@localhost:27017/ssrs-daiict';*/


/* Online Database */
const dbURI = process.env.DB_URI;

db.connect(dbURI)
    .then(
        () => {
            console.log('MongoDB connection established');
        },
        (err) => {
            console.log(`Cannot connect to mongoDB\n${err}`);
        }
    );

// Routes
const order = require('./routes/order');
const cart = require('./routes/cart');
const user = require('./routes/user');
const account = require('./routes/account');
const service = require('./routes/service');
const news = require('./routes/news');
const parameter = require('./routes/parameter');
const access = require('./routes/access');
const notification = require('./routes/notification');
const collectionType = require('./routes/collectionType');
const courier = require('./routes/courier');
const collector = require('./routes/collector');
const userInfo = require('./routes/userInfo');
const dashBoard = require('./routes/dashboard');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');


//Middlewares
if (isInternetAvaliable) {
    app.use(Sentry.Handlers.requestHandler());
}

if (app.get('env') === 'development') {
    app.use(morgan('dev'));
}

app.use(flash());
app.use(favicon());
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :response-time ms :res[content-length] ":referrer" ":user-agent"', { stream: accessLogStream }));
app.use(bodyParser.json({limit: "10mb"}));
app.use(cookieParser());
app.use(session({ secret: 'Shh, its a secret!' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors({
    origin: true,
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
    credentials: true,
}));

app.get('/SSRS/user/accept_payment',function(req,res,next){
    const cartController = require('./controllers/cart');
    cartController.acceptEasyPayPayment(req,res,next);
});

// Routes
app.use('/account', account);
app.use('/news', news);
app.use('/user', user);
app.use('/access', access);
app.use('/service', service);
app.use('/parameter', parameter);
app.use('/notification', notification);
app.use('/collectionType', collectionType);
app.use('/order', order);
app.use('/delivery', courier);
app.use('/collector', collector);
app.use('/cart', cart);
app.use('/userInfo', userInfo);
app.use('/dashboard', dashBoard);


if (isInternetAvaliable) {
    app.use(Sentry.Handlers.errorHandler());
}

// Catch 404 Errors and forward them to error handler function
app.use((req, res, next) => {
    res.sendStatus(HttpStatus.NOT_FOUND);
});

// Error handler function
app.use((err, req, res, next) => {
    const error = err;
    const status = err.status || HttpStatus.INTERNAL_SERVER_ERROR;

    // response to client
    res.status(status)
        .json({ error });

    // response to server
    console.error(err);
});

// start server
const port = process.env.PORT || 3001;

app.listen(port, () => console.log(`Server is listnening on port ${port}`));
// https.createServer({
//     key: fs.readFileSync('../SSL/commercial.key'),
//     cert: fs.readFileSync('../SSL/f2e066dddbc1a42e.crt'),
//     ca: [fs.readFileSync('../SSL/gd1.crt'), fs.readFileSync('../SSL/gd2.crt'), fs.readFileSync('../SSL/gd3.crt')]
// }, app).listen(port, () => console.log(`Server is listnening on port ${port}`));

