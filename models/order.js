const moongose = require('mongoose');

const { Schema } = moongose;
/**Payment remaining */
const orderSchema = new Schema({
    collectionCode:{
        type:String,
        required:true,
        unique:true,
    },
    requestedBy: {
        type: Number,
        required:true,
    },
    serviceId: {
        type: Schema.Types.ObjectId,
        ref: 'service',
        required:true,
    },
    collectionType:{
        courier:{
            type:Schema.Types.ObjectId,
            ref: 'courier'
        },
        pickup:{
            type:Schema.Types.ObjectId,
            ref: 'collector'
        },
    },
    createdOn:{
        type:Date,
        required:true,
    },
    amount:{
        type:Number,
        require:true,
    },
    status:{
        type:Number,
        default:0,
    },
    parameters:[{
        type: Schema.Types.ObjectId,
        ref: 'parameter',
    }],
});


const Order = moongose.model('order', orderSchema);
module.exports = Order;
