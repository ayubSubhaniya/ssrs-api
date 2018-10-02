const moongose = require('mongoose');
const Schema = moongose.Schema;

const {collectionStatus} = require('../configuration');

const courierSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    contactNo: {
        type: String,
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
        type: String,
        required: true,
    },
    trackingId: {
        type: String,
    },
    courierServiceName: {
        type: String,
    },
    cartId: {
        type: Schema.Types.ObjectId,
        ref: 'cart',
        required: true,
    },
    status: {
        type: Number,
        default: collectionStatus.pendingPayment,
    }
});

const Courier = moongose.model('courier', courierSchema);
module.exports = Courier;
