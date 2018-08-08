const moongose = require('mongoose');

const { Schema } = moongose;

const orderSchema = new Schema({
    requestedBy: {
        type: Number,
        required:true,
    },
    serviceId: {
        type: Schema.Types.ObjectId,
        ref: 'service',
    },
    orderNo: 'Number',
    createdOn: 'Date',
    amount: 'Number',
    paymentMode: {
        online: 'Boolean',
        offline: {
            isPaymentDone: 'Boolean',
        },
    },
    collectionDetails: {
        onCampus: 'Boolean',
        collector: {
            name: 'String',
            daiictId: 'Number',
            contactNo: 'Number',
            email: 'String',
            address: 'String',
            city: 'String',
            state: 'String',
            pincode: 'Number',
        },
    },
    parameters: {
        type: Schema.Types.ObjectId,
        ref: 'parameter',
    },
    receiverCode: 'String',
});


const Order = moongose.model('order', orderSchema);
module.exports = Order;
