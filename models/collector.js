const moongose = require('mongoose');
const Schema = moongose.Schema;

const collectorSchema = new Schema({
    name : {
        type:String,
        required:true,
    },
    daiictId:{
        type:Number,
    },
    contactNo:{
        type:Number,
        required:true,
    },
    email:{
        type:String,
        required:true,
    },
});

const Collector = moongose.model('collector', collectorSchema);
module.exports = Collector;