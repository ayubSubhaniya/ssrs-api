const db = require('mongoose');

const { Schema } = db;
const { collectionStatus } = require('../configuration');

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
        type: Boolean,
        default: false
    },
    paymentFailHistory: [{
        paymentId: {
            type: String,
        },
        paymentDate: {
            type: String,
        },
        paymentType: {
            type: String,
        },
    }],
    collectionType: {
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
        category: {
            type: String,
            required: true
        }
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
        name: {
            type: String,
        },
        contactNo: {
            type: String,
        },
        email: {
            type: String,
        },
        createdOn: {
            type: Date,
        },
        createdBy: {
            type: String,
        },
        address: {
            line1: {
                type: String,
            },
            line2: {
                type: String,
            },
            line3: {
                type: String,
            },
        },
        city: {
            type: String,
        },
        state: {
            type: String,
        },
        country: {
            type: String,
        },
        pinCode: {
            type: String,
        },
        trackingId: {
            type: String,
        },
        courierServiceName: {
            type: String,
        },
        status: {
            type: Number,
            default: collectionStatus.pendingPayment,
        }
    },
    pickup: {
        name: {
            type: String,
        },
        daiictId: {
            type: String,
        },
        contactNo: {
            type: String,
        },
        email: {
            type: String,
        },
        collectionCode: {
            type: String,
        },
        createdOn: {
            type: Date,
        },
        createdBy: {
            type: String,
        }
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
            default: ''
        },
        readyToDeliver: {
            type: String,
            default: ''
        },
        readyToPickup: {
            type: String,
            default: ''
        },
        completed: {
            type: String,
            default: ''
        },
        onHold: {
            type: String,
            default: ''
        },
        cancelled: {
            type: String,
            default: ''
        },
        refunded: {
            type: String,
            default: ''
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
