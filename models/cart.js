const orderid = require('order-id')('ssrs-daiict');
const db = require('mongoose');
const deepPopulate = require('mongoose-deep-populate')(db);

const { Schema } = db;
const { cartStatus } = require('../configuration');

const cartSchema = new Schema({
    orderId:{
        type: String,
        required:true,
        unique:true
    },
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
    cancelReason: {
        type: String
    },
});

cartSchema.pre('validate', function (next) {
    this.orderId = orderid.generate();
    next();
});


cartSchema.plugin(deepPopulate);

const Cart = db.model('cart', cartSchema);
module.exports = Cart;
