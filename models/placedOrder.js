const db = require('mongoose');

const { Schema } = db;

const placedOrderSchema = new Schema({
    requestedBy: {
        type: String,
        required: true,
    },
    cartId: {
        type: Schema.Types.ObjectId,
        ref: 'placedCart',
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
    parameters: [{
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
    }],
    cancelReason: {
        type: String
    },
    holdReason: {
        type: String
    },
    statusChangeTime: {
        paymentFailed: {
            time: Date,
            by: String,
        },
        invalidOrder: {
            time: Date,
            by: String,
        },
        unplaced: {
            time: Date,
            by: String,
        },
        placed: {
            time: Date,
            by: String,
        },
        processing: {
            time: Date,
            by: String,
        },
        ready: {
            time: Date,
            by: String,
        },
        completed: {
            time: Date,
            by: String,
        },
        onHold: {
            time: Date,
            by: String,
        },
        cancelled: {
            time: Date,
            by: String,
        },
        refunded: {
            time: Date,
            by: String,
        }
    },
    lastModified: {
        type: Date,
    },
    lastModifiedBy: {
        type: String,
    },
});


placedOrderSchema.pre('save', function (next) {
    this.totalCost = this.serviceCost + this.parameterCost;
    next();
});

const PlacedOrder = db.model('placedOrder', placedOrderSchema);
module.exports = PlacedOrder;
