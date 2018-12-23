const db = require('mongoose');

const { Schema } = db;

const placedOrderSchema = new Schema({
    orderId: {
        type: Schema.Types.ObjectId,
        ref: 'order',
        required: true
    },
    requestedBy: {
        type: String,
        required: true,
    },
    cartId: {
        type: Schema.Types.ObjectId,
        ref: 'cart',
        required: true,
    },
    service: {
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String
        },
        baseCharge: {
            type: Number,
            default: 0,
        },
    },
    unitsRequested: {
        type: Number,
        default: 1,
    },
    createdOn: {
        type: Date,
        required: true,
    },
    serviceCost: {
        type: Number,
        default: 0,
    },
    parameterCost: {
        type: Number,
        default: 0,
    },
    totalCost: {
        type: Number,
        default: 0,
    },
    status: {
        type: Number,
        default: 0,
    },
    comment: {
        type: String,
    },
    // parameters: [{
    //     type: Schema.Types.ObjectId,
    //     ref: 'parameter',
    // }],
    cancelReason: {
        type: String
    }
});


placedOrderSchema.pre('save', function (next) {
    this.totalCost = this.serviceCost + this.parameterCost;
    next();
});

const PlacedOrder = db.model('placedOrder', placedOrderSchema);
module.exports = PlacedOrder;
