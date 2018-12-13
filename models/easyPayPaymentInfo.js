const moongose = require('mongoose');

const { Schema } = moongose;

const easyPayPaymentInfo = new Schema({
    responseCode: {
        type: String,
    },
    uniqueRefNo: {
        type: String,
    },
    serviceTaxAmount: {
        type: String,
    },
    processingFeeAmount: {
        type: String,
    },
    totalAmount: {
        type: String,
    },
    transactionAmount: {
        type: String,
    },
    transactionDate: {
        type: String,
    },
    interchangeValue: {
        type: String,
    },
    tdr: {
        type: String,
    },
    paymentMode: {
        type: String,
    },
    subMerchantId: {
        type: String,
    },
    referenceNo: {
        type: String,
    },
    tps: {
        type: String,
    },
    id: {
        type: String,
    },
    rs: {
        type: String,
    },

});


const EasyPayPaymentInfo = moongose.model('easyPayPaymentInfo', easyPayPaymentInfo);
module.exports = EasyPayPaymentInfo;
