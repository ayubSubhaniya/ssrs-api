const moongose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Schema } = moongose;
const { userTypes } = require('../configuration');

const userSchema = new Schema({

    /*User supplied field*/
    daiictId: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        firstName: {
            type: String,
        },
        lastName: {
            type: String,
        },
    },
    primaryEmail: {
        type: String,
        required: true,
        unique: true,
    },
    secondaryEmail: {
        type: String,
    },
    contactNo: {
        type: Number,
    },
    password: {
        type: String,
        required: true
    },
    gender: {
        type: String,
    },
    programme: {
        type: String,
    },

    /*Server added field*/
    createdOn: {
        type: Date,
        required: true
    },
    userType: {
        type: String,
        required: true,
        default: userTypes.student
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true
    },

    cartId: {
      type: Schema.Types.ObjectId,
      ref:'cart',
      required:true,
    },

    requestedServices: [{
        type: Schema.Types.ObjectId,
        ref: 'order',
    }],
});

userSchema.methods.isValid = async function (newPassword) {
    try {
        return await bcrypt.compare(newPassword, this.password);
    } catch (error) {
        throw new Error(error);
    }
};


const User = moongose.model('user', userSchema);
module.exports = User;
