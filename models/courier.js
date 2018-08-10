const moongose = require('mongoose');
const Schema = moongose.Schema;

const courierSchema = new Schema({
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
    address:{
        addressLine1:{
            type:String,
        },
        addressLine2:{
            type:String,
        },
        addressLin3:{
            type:String,
        },
        required:true,
    },
    city:{
        type:String,
        required:true,
    },
    state:{
        type:String,
        required:true,
    },
    country:{
        type:String,
        default:'India',
    },
    pincode:{
        type:Number,
        required:true,
    },
    trackingId:{
        type:String,
    },
    speedPostName:{
        type:String,
    }
});

const Courier = moongose.model('courier', courierSchema);
module.exports = Courier;