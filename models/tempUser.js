const moongose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Schema } = moongose;
const { userTypes } = require('../configuration');

const userSchema = new Schema({

    /*User supplied field*/
    daiictId: {
        type: Number,
        required: true,
        unique: true,
    },
    primaryEmail: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true
    },
    randomHash: {
        type: String,
        required: true,
    },

    /*Server added field*/
    createdOn: {
        type: Date,
        required: true
    },

});

userSchema.methods.isValid = async function (newPassword) {
    try {
        return await bcrypt.compare(newPassword, this.password);
    } catch (error) {
        throw new Error(error);
    }
};

const tempUser = moongose.model('tempUser', userSchema);
module.exports = tempUser;
