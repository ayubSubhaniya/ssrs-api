const db = require('mongoose');
const Schema = db.Schema;
const collectorIdGenerator = require('shortid');

const {collectionStatus} = require('../configuration');

const collectorSchema = new Schema({
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
        ref: 'cart',
        required: true,
    },
    status: {
        type: Number,
        default: collectionStatus.pendingPayment,
    }
});

collectorSchema.pre('validate', function (next) {
    collectorIdGenerator.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ#?');
    this.collectionCode = collectorIdGenerator.generate();
    next();
});

const Collector = db.model('collector', collectorSchema);
module.exports = Collector;
