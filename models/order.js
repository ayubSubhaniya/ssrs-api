const db = require('mongoose');

const { Schema } = db;

const orderSchema = new Schema({
    requestedBy: {
        type: String,
        required: true,
    },
    serviceName: {
        type: String,
        required: true,
    },
    serviceId: {
        type: Schema.Types.ObjectId,
        ref: 'service',
        required: true,
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
        default:0,
    },
    parameterCost: {
        type: Number,
        default:0,
    },
    collectionTypeCost: {
        type: Number,
        default:0,
    },
    totalCost: {
        type: Number,
        default:0,
    },
    status: {
        type: Number,
        default: 0,
    },
    parameters: [{
        type: Schema.Types.ObjectId,
        ref: 'parameter',
    }],
    paymentType: {
        type: Number,
    },
    isPaymentDone: {
        type: Boolean,
        default: false,
    },
    paymentId: {
        type: String,
    },

    collectionType: {
        type: String,
    },
    courier: {
        type: Schema.Types.ObjectId,
        ref: 'courier'
    },
    pickup: {
        type: Schema.Types.ObjectId,
        ref: 'collector'
    },
});

const paymentSchemaValidator = (order) => {
    return !order.isPaymentDone || order.paymentId;
};

const collectionTypeSchemaValidator = (order) => {
    return !collectionType || (order.courier == null ^ order.pickup == null);
};

orderSchema.pre('save', function (next) {
    if (!paymentSchemaValidator(this)) {
        const err = new Error('Invalid payment information');
        next(err);
    } else if (!collectionTypeSchemaValidator(this)) {
        const err = new Error('Invalid collectionType information');
        next(err);
    } else {
        this.totalCost = this.serviceCost + this.parameterCost + this.collectionTypeCost;
        next();
    }
});

const Order = db.model('order', orderSchema);
module.exports = Order;
