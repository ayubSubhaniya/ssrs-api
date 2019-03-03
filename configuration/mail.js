const nodemailer = require('nodemailer');
const { logger } = require('../configuration/logger');

const { daiictMailDomainName } = require('../configuration');

const mailAccountEmailId = process.env.MAIL_USER;
const mailAccountPassword = process.env.MAIL_PASS;

/*
    SMTP server configuration
*/

const smtpTransport = nodemailer.createTransport({
    host: 'webmail.daiict.ac.in',
    port: 465,
    secureConnection: true,
    auth: {
        user: mailAccountEmailId,
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

const sendMail = async (toId, cc, bcc, subject, html, text, domain=daiictMailDomainName) => {
    if (toId instanceof Array){
        toId = toId.map(function (x) {
            return `${x}@${domain}`
        });
        for (let i=0;i<toId.length;i++){
            const info = await smtpTransport.sendMail({
                from: mailAccountEmailId,
                to: toId[i],
                cc,
                bcc,
                subject,
                text,
                html
            });
        }
    } else {
        toId = `${toId}@${domain}`;
        const info = await smtpTransport.sendMail({
            from: mailAccountEmailId,
            to: toId,
            cc,
            bcc,
            subject,
            text,
            html
        });
    }
    // const info = await smtpTransport.sendMail({
    //     from: mailAccountEmailId,
    //     to: toId,
    //     cc,
    //     bcc,
    //     subject,
    //     text,
    //     html
    // });
};

module.exports = {
    sendMail,
    smtpTransport
};
