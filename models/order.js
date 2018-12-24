const db = require('mongoose');

const { Schema } = db;

const orderSchema = new Schema({
    requestedBy: {
        type: String,
        required: true,
    },
    cartId: {
        type: Schema.Types.ObjectId,
        ref: 'cart',
        required: true,
    },
    serviceName: {
        type: String,
        required: true,
    },
    service: {
        type: Schema.Types.ObjectId,
        ref: 'service',
        required: true,
    },
    unitsRequested: {
        type: Number,
        default: 1,
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
        type: Schema.Types.ObjectId,
        ref: 'parameter',
    }],
    validityErrors: [{
        type: String,
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
    }
});


orderSchema.pre('save', function (next) {
    this.totalCost = this.serviceCost + this.parameterCost;
    next();
});

const Order = db.model('order', orderSchema);
module.exports = Order;
