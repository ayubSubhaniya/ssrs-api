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
    isAvailableForAlumni: {
        type: Boolean,
        default: false,
    },
    isCourierAvailable: {
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
        debitCard: {
            type: Boolean,
            default: false,
        },
        netBanking: {
            type: Boolean,
            default: false,
        },
        paytm: {
            type: Boolean,
            default: false,
        },
        cashOnDelivery: {
            type: Boolean,
            default: false,
        },
    },
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
    templateFile: {
        type: Buffer,
    },
    templateTags: [{
        type: String
    }]
});

const Service = moongose.model('service', serviceSchema);
module.exports = Service;
