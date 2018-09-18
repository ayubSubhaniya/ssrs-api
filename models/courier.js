const moongose = require('mongoose');
const Schema = moongose.Schema;

const courierSchema = new Schema({
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
            required: true,
        },
        line3: {
            type: String,
            required: true,
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
    },
    trackingId: {
        type: String,
    },
    courierServiceName: {
        type: String,
    },
    orderId: {
        type: Schema.Types.ObjectId,
        ref: 'order',
        required: true,
    }
});

const Courier = moongose.model('courier', courierSchema);
module.exports = Courier;
