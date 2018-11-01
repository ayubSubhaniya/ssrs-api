const crypto = require('crypto'),
    algorithm = 'aes-128-ecb',
    password = process.env.aeskey;

function encrypt(text){
    const cipher = crypto.createCipheriv(algorithm,password,'');
    let crypted = cipher.update(text,'utf8','base64');
    crypted += cipher.final('base64');
    return crypted;
}

function decrypt(text){
    const decipher = crypto.createDecipheriv(algorithm,password,'');
    let dec = decipher.update(text,'base64','utf8');
    dec += decipher.final('utf8');
    return dec;
}

const createSHASig=(text)=>{
    const hash = crypto.createHmac('sha512', process.env.aeskey);
    hash.update(text);
    const value = hash.digest('hex');
    return value;
};

const encryptUrl = (url)=>{
    const routeAndQueryPair = url.split("?");

    const urlParams = routeAndQueryPair[1].split("&");
    const excludedParams = ["merchantid","optional fields"];
    const encryptedParams = [];

    for (let i=0;i<urlParams.length;i++)
    {
        const keyValPair=urlParams[i].split("=");

        if (excludedParams.includes(keyValPair[0])){
            encryptedParams[i]=urlParams[i];
        } else {
            encryptedParams[i]=keyValPair[0]+"="+ encrypt(keyValPair[1]);
        }
    }
    return routeAndQueryPair[0] + "?" + encryptedParams.join("&");
};

const decryptUrl = (url)=>{
    const routeAndQueryPair = url.split("?");
    const excludedParams = ["merchantid","optional fields"];
    const urlParams = routeAndQueryPair[1].split("&");

    const decryptedParams = [];

    for (let i=0;i<urlParams.length;i++)
    {
        const keyValPair=urlParams[i].split("=");
        if (excludedParams.includes(keyValPair[0])){
            decryptedParams[i]=urlParams[i];
        } else {
            decryptedParams[i]=keyValPair[0]+"="+ decrypt(keyValPair[1]);
        }
    }
    return routeAndQueryPair[0] + "?" + decryptedParams.join("&");
};

//const plaintext = 'https://eazypay.icicibank.com/EazyPG?merchantid=100011&mandatoryfields=8001|1234|80|9000000001&optionalfields=20|20|20|20&returnurl=http://abc.com/cbc/action.aspx&ReferenceNo=8001&submerchantid=1234&transactionamount=80&paymode=9';
//const expectedDecryptedText = 'https://eazypay.icicibank.com/EazyPG?merchantid=100011&mandatoryfields=u65A+ywICIypfrJVQp9ED2VlkBzkIimiHhLXPyo2P14=&optionalfields=faJ6BJUlOqjoV/AEbw5X4g==&returnurl=6WvzNalyXvqOX+aY9ee5oKm8FT+YUF5sz940o6QZvx0=&ReferenceNo=X7VX+1ZnKq+o6K2QWCTERQ==&submerchantid=QVZkBomDLSbitS4C9lGaUA==&transactionamount=aTRTaIdS0sLyzGCxL3Y5dQ==&paymode=nFRjDWSCg0m80aUYivDlqw==';

//console.log(encryptUrl(plaintext)===expectedDecryptedText);
//console.log(decryptUrl(expectedDecryptedText)===plaintext);

module.exports = {
    encryptUrl,
    decryptUrl,
    createSHASig
};
