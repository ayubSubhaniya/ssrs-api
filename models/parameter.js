const moongose = require('mongoose');

const { Schema } = moongose;

const parameterSchema = new Schema({
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
    createdOn: {
        type: Date,
        required: true,
    },
    createdBy: {
        type: String,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    }
});

const Parameter = moongose.model('parameter', parameterSchema);
module.exports = Parameter;
