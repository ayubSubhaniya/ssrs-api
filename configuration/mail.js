const nodemailer = require('nodemailer');
const { logger } = require('../configuration/logger');

const { daiictMailDomainName } = require('../configuration');

const mailAccountUserName = process.env.MAIL_USER;
const mailAccountPassword = process.env.MAIL_PASS;

/*
    SMTP server configuration
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

smtpTransport.verify(function (error, success) {
    if (error) {
        logger.error(error);
    } else {
        logger.info('Mail server is ready to take our messages');
    }
});

const sendMail = async (toId, subject, text, html) => {
    const info = await smtpTransport.sendMail({
        to: `${toId}@${daiictMailDomainName}`,
        subject,
        text,
        html
    });
};

module.exports = {
    sendMail,
    smtpTransport
};
