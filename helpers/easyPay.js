const { encryptUrl } = require('../helpers/crypto');

const getMandatoryEasyPayFields = (cart) => {
    return `${cart.paymentCode}|${process.env.submerchantid}|${cart.totalCost}`;
};

const getEasyPayUrl = (cart) => {
    let url = process.env.url + '?';
    url += 'merchantid=' + process.env.merchantid;
    url += '&mandatory fields=' + getMandatoryEasyPayFields(cart);
    url += '&optional fields=';
    url += '&returnurl=' + process.env.returnurl;
    url += '&Reference No=' + cart.paymentCode;
    url += '&submerchantid=' + process.env.submerchantid;
    url += '&transaction amount=' + cart.totalCost;
    url += '&paymode=' + process.env.paymode;
    return encryptUrl(url);
};

module.exports = {
    getEasyPayUrl
};
