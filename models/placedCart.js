const db = require('mongoose');

const { Schema } = db;

const placedCartSchema = new Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
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
    paymentStatus: {
        type:Boolean,
        default:false
    },
    paymentFailHistory:[{
        paymentId:{
            type:String,
        },
        paymentDate:{
            type:String,
        },
        paymentType:{
            type:String,
        },
    }],
    collectionType: {
        type: String,
    },
    collectionTypeCategory: {
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
    statusChangeTime: {
        paymentFailed: {
            time: Date,
            by: String,
        },
        invalid: {
            time: Date,
            by: String,
        },
        unplaced: {
            time: Date,
            by: String,
        },
        processingPayment: {
            time: Date,
            by: String,
        },
        placed: {
            time: Date,
            by: String,
        },
        paymentComplete: {
            time: Date,
            by: String,
        },
        processing: {
            time: Date,
            by: String,
        },
        readyToDeliver: {
            time: Date,
            by: String,
        },
        readyToPickup: {
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
    comment: {
        processing: {
            type: String,
            default: ""
        },
        readyToDeliver: {
            type: String,
            default: ""
        },
        readyToPickup: {
            type: String,
            default: ""
        },
        completed: {
            type: String,
            default: ""
        },
        onHold: {
            type: String,
            default: ""
        },
        cancelled: {
            type: String,
            default: ""
        },
        refunded: {
            type: String,
            default: ""
        }
    },
    lastModified: {
        type: Date,
    },
    lastModifiedBy: {
        type: String,
    },
});

const PlacedCart = db.model('placedCart', placedCartSchema);
module.exports = PlacedCart;
