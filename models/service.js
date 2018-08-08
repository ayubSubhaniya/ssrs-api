const moongose = require('mongoose');
const beautifyUnique = require('mongoose-beautiful-unique-validation');
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
    createdBy:{
        type:Number,
        required:true,
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
    availableParameters: [{
        type: Schema.Types.ObjectId,
        ref: 'parameter',
    }],
    specialServiceUsers:[{
        type: Schema.Types.ObjectId,
        ref:'parameter',
    }],
});

serviceSchema.plugin(beautifyUnique);

const Service = moongose.model('service', serviceSchema);
module.exports = Service;
