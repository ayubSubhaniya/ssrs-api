const moongose = require('mongoose');
const Schema = moongose.Schema;

const courierInfoSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    contactNo: {
        type: Number,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    createdOn: {
        type: Date,
        required: true
    },
    createdBy: {
        type: String,
        required: true
    },
    address: {
        line1: {
            type: String,
            required: true,
        },
        line2: {
            type: String,
        },
        line3: {
            type: String,
        },
    },
    city: {
        type: String,
        required: true,
    },
    state: {
        type: String,
        required: true,
    },
    country: {
        type: String,
        default: 'India',
    },
    pinCode: {
        type: Number,
        required: true,
    }
});

const CourierInfo = moongose.model('courierinfo', courierInfoSchema);
module.exports = CourierInfo;
