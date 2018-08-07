const moongose = require('mongoose');

const { Schema } = moongose;

const adminSchema = new Schema({
    daiictId: 'Number',
    name: {
        firstName: 'String',
        lastName: 'String',
    },
    email: {
        primary: 'String',
        secondary: 'String',
    },
    contactNo: 'Number',
    role: [{
        type: 'String'
    }],
    department: [{
        type: 'String'
    }],
    password: 'String',
    createdOn: 'Date',
    gender: 'String',
    status: 'String',
    notifications: [{
        type: Schema.Types.ObjectId,
        ref: 'notification',
    }],
});


const Admin = moongose.model('user', adminSchema);
module.exports = Admin;
