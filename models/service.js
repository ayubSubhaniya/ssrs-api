const moongose = require('mongoose');
const { Schema } = moongose;

const serviceSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String
    },
    createdOn: {
        type: Date,
        required: true,
    },
    createdBy: {
        type: String,
        required: true,
    },
    isApplicationSpecific: {
        type: Boolean,
        default: false,
    },
    isSpecialService: {
        type: Boolean,
        default: false,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    maxUnits: {
        type: Number,
        default: 1,
    },
    baseCharge: {
        type: Number,
        default: 0,
    },
    paymentModes: {
        offline: {
            type: Boolean,
            default: false,
        },
        online: {
            type: Boolean,
            default: false,
        },
    },
    availablePaymentModes: [{
        type: String
    }],
    collectionTypes: [{
        type: Schema.Types.ObjectId,
        ref: 'collectionType'
    }],
    availableParameters: [{
        type: Schema.Types.ObjectId,
        ref: 'parameter',
    }],
    specialServiceUsers: [{
        type: String,
    }],
    allowedUserTypes: [{
        type: String,
    }],
    allowedProgrammes: [{
        type: String,
    }],
    allowedBatches: [{
        type: String,
    }]
});

// serviceSchema.pre('save', function (next) {
//     this.availableParameters.map(function (x) {
//        return x.toLowerCase();
//     });
//     next();
// });

const Service = moongose.model('service', serviceSchema);
module.exports = Service;
