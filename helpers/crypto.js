const crypto = require('crypto'),
    algorithm = 'aes-128-ecb',
    password = process.env.aeskey;

function encrypt(text) {
    const cipher = crypto.createCipheriv(algorithm, password, '');
    let crypted = cipher.update(text, 'utf8', 'base64');
    crypted += cipher.final('base64');
    return crypted;
}

function decrypt(text) {
    const decipher = crypto.createDecipheriv(algorithm, password, '');
    let dec = decipher.update(text, 'base64', 'utf8');
    dec += decipher.final('utf8');
    return dec;
}

const createSHASig = (text) => {
    const hash = crypto.createHash('sha512', password);
    hash.update(text);
    return hash.digest('hex');
};

const encryptUrl = (url) => {
    const routeAndQueryPair = url.split('?');

    const urlParams = routeAndQueryPair[1].split('&');
    const excludedParams = ['merchantid', 'optional fields'];
    const encryptedParams = [];

    for (let i = 0; i < urlParams.length; i++) {
        const keyValPair = urlParams[i].split('=');

        if (excludedParams.includes(keyValPair[0])) {
            encryptedParams[i] = urlParams[i];
        } else {
            encryptedParams[i] = keyValPair[0] + '=' + encrypt(keyValPair[1]);
        }
    }
    return routeAndQueryPair[0] + '?' + encryptedParams.join('&');
};

const decryptUrl = (url) => {
    const routeAndQueryPair = url.split('?');
    const excludedParams = ['merchantid', 'optional fields'];
    const urlParams = routeAndQueryPair[1].split('&');

    const decryptedParams = [];

    for (let i = 0; i < urlParams.length; i++) {
        const keyValPair = urlParams[i].split('=');
        if (excludedParams.includes(keyValPair[0])) {
            decryptedParams[i] = urlParams[i];
        } else {
            decryptedParams[i] = keyValPair[0] + '=' + decrypt(keyValPair[1]);
        }
    }
    return routeAndQueryPair[0] + '?' + decryptedParams.join('&');
};

module.exports = {
    encryptUrl,
    decryptUrl,
    createSHASig
};
