const moongose = require('mongoose');
const Schema = moongose.Schema;

const collectorSchema = new Schema({
    name: String,
    daiictId: Number,
    contactNo: Number,
    email: String,
    address: String,
    city: String,
    state: String,
    pincode: Number
});

const Collector = moongose.model('collector', collectorSchema);
module.exports = Collector;