const db = require('mongoose');
const Schema = db.Schema;
const collectorIdGenerator = require('shortid');

const collectorSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    daiictId: {
        type: Number,
    },
    contactNo: {
        type: Number,
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
        type: Number,
        required: true
    },
    orderId: {
        type: Schema.Types.ObjectId,
        ref: 'order',
        required: true,
    }
});

collectorSchema.pre('validate', function (next) {
    this.collectionCode = collectorIdGenerator.generate();
    next();
});

const Collector = db.model('collector', collectorSchema);
module.exports = Collector;
