const db = require('mongoose');

const { Schema } = db;

const placedCartSchema = new Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    cartId: {
        type: Schema.Types.ObjectId,
        ref: 'cart',
        required: true
    },
    orders: [{
        type: Schema.Types.ObjectId,
        ref: 'placedOrder'
    }],
    paymentType: {
        type: String,
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
    delivery: {
        type: Schema.Types.ObjectId,
        ref: 'delivery'
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
    status: {
        type: Number,
    },
    cancelReason: {
        type: String
    },
});

const PlacedCart = db.model('placedCart', placedCartSchema);
module.exports = PlacedCart;
