const db = require('mongoose');

const { Schema } = db;
const { cartStatus } = require('../configuration');

const cartSchema = new Schema({
    orders: [{
        type: Schema.Types.ObjectId,
        ref: 'order'
    }],
    paymentType: {
        type: Number,
    },
    paymentId: {
        type: String,
    },
    paymentCode: {
        type: String,
    },
    collectionType: {
        type: String,
    },
    collectionTypeCost: {
        type: Number,
        default: 0,
    },
    ordersCost: {
        type: Number,
        default: 0,
    },
    totalCost: {
        type: Number,
        default: 0,
    },
    courier: {
        type: Schema.Types.ObjectId,
        ref: 'courier'
    },
    pickup: {
        type: Schema.Types.ObjectId,
        ref: 'collector'
    },
    requestedBy: {
        type: String,
        required: true
    },
    createdOn: {
        type: Date,
        required: true,
    },
    lastModified: {
        type: Date,
    },
    lastModifiedBy: {
        type: String,
    },
    status: {
        type: Number,
        default: cartStatus.unplaced,
    },
    validityErrors: [{
        type: String,
    }],
});

const Cart = db.model('cart', cartSchema);
module.exports = Cart;
