const express = require('express');
const logger = require('morgan');
const mongoose = require('mongoose'); 
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const HttpStatus = require('http-status-codes');
const cors = require('cors');
const dbURI = 'mongodb://localhost/ssrs-daiict'
mongoose.connect(dbURI);

const app = express()

// Routes
const order = require('./routes/order');
const user = require('./routes/user');
const account = require('./routes/account');
const service = require('./routes/service');
const news = require('./routes/news')
const parameter = require('./routes/parameter')
const access = require('./routes/access')
const notification = require('./routes/notification')

// Middlewares
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(cookieParser())

app.use(cors({
    origin:true,
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
    credentials:true,
}));

// Routes
app.use('/account', account)
app.use('/news/',news)
app.use('/user/',user)
app.use('/access/',access)
app.use('/service/',service)
app.use('/parameter/',parameter)
app.use('/notification/',notification)


// Catch 404 Errors and forward them to error handler function
app.use((req, res, next) => {
    const err = new Error('Not Found');
    err.status = HttpStatus.NOT_FOUND;
    next(err);
});

// Error handler function
app.use((err, req, res, next) => {
    const error = app.get('env') === 'development' ? err : {};
    const status = err.status || HttpStatus.INTERNAL_SERVER_ERROR;

    // response to client
    res.status(status).json({
        error: {
            message: error.message,
        },
    });

    // response to server
    console.error(err);
});

// start server
const port = app.get('port') || 3001;

app.listen(port, () => console.log(`Server is listnening on port ${port}`));
