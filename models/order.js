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


orderSchema.pre('save', function (next) {
    this.totalCost = this.serviceCost + this.parameterCost;
    next();
});

const Order = db.model('order', orderSchema);
module.exports = Order;
