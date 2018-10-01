const db = require('mongoose');

const { Schema } = db;

const placedCartSchema = new Schema({
    cartId:{
        type: Schema.Types.ObjectId,
        ref: 'cart',
        required: true
    },
    orders: [{
        type: Schema.Types.ObjectId,
        ref: 'placedOrder'
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
    status: {
        type: Number,
        default: cartStatus.unplaced,
    },
    cancelReason: {
        type: String
    },
});

const PlacedCart = db.model('placedCart', placedCartSchema);
module.exports = PlacedCart;
