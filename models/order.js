const db = require('mongoose');

const { Schema } = db;

const paymentSchema = {
    paymentType: {
        type: String,
        required: true,
    },
    isPaymentDone: {
        type: Boolean,
        default: false,
    },
    paymentId: {
        type: String,
    },
};

const paymentSchemaValidator = (payment) => {
    return !payment.isPaymentDone || payment.paymentId;
};

const collectionTypeSchema = {
    courier: {
        type: Schema.Types.ObjectId,
        ref: 'courier'
    },
    pickup: {
        type: Schema.Types.ObjectId,
        ref: 'collector'
    },
};

const collectionTypeSchemaValidator = (collectionType) => {
    return !collectionType.courier || !collectionType.pickup;
};

const orderSchema = new Schema({
    requestedBy: {
        type: Number,
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
        type: Number,
    },
    serviceCost: {
        type: Number,
        require: true,
    },
    parameterCost: {
        type: Number,
        require: true,
    },
    collectionTypeCost: {
        type: Number,
        require: true,
    },
    totalCost: {
        type: Number,
        require: true,
    },
    status: {
        type: Number,
        default: 0,
    },
    parameters: [{
        type: Schema.Types.ObjectId,
        ref: 'parameter',
    }],
    payment: {
        type: paymentSchema,
        validate: paymentSchemaValidator,
    },
    collectionType: {
        type: collectionTypeSchema,
        validate: collectionTypeSchemaValidator,
    },
});

orderSchema.pre('save', function (next) {
    this.totalCost = this.serviceCost + this.parameterCost + this.collectionTypeCost;
    next();
});

const Order = db.model('order', orderSchema);
module.exports = Order;
