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
            required: true,
        },
        contactNo: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        createdOn: {
            type: Date,
            required: true
        },
        createdBy: {
            type: String,
            required: true
        },
        address: {
            line1: {
                type: String,
                required: true,
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
            required: true,
        },
        state: {
            type: String,
            required: true,
        },
        country: {
            type: String,
            default: 'India',
        },
        pinCode: {
            type: String,
            required: true,
        }
    },
    pickup: {
        name: {
            type: String,
            required: true,
        },
        daiictId: {
            type: String,
        },
        contactNo: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        collectionCode: {
            type: String,
            required: true,
            unique: true,
        },
        createdOn: {
            type: Date,
            required: true
        },
        createdBy: {
            type: String,
            required: true
        },
        cartId: {
            type: Schema.Types.ObjectId,
            ref: 'placedCart',
            required: true,
        },
        status: {
            type: Number,
            default: collectionStatus.pendingPayment,
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
