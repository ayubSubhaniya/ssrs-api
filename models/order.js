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
        default:0,
    },
    parameterCost: {
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
    comment: {
        type: String,
    },
    parameters: [{
        type: Schema.Types.ObjectId,
        ref: 'parameter',
    }],
    validityErrors: [{
       type:String,
    }],
});

const paymentSchemaValidator = (order) => {
    return !order.isPaymentDone || order.paymentId;
};

const collectionTypeSchemaValidator = (order) => {
    return !order.collectionType || (order.courier === undefined ^ order.pickup === undefined)===1;
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
