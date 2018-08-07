const moongose = require('mongoose')
const bcrypt = require('bcryptjs')
const { Schema } = moongose
const {userTypes} = require('../configuration')

const userSchema = new Schema({

    /*User supplied field*/
    daiictId:{
        type:Number,
        required:true,
        unique:true,
    } ,
    name: {
        firstName:{
            type:String,
            //default:'NA'
        } ,
        lastName:{
            type:String,
            //default:'NA'
        },
    },
    primaryEmail:{
        type:String,
        required:true,
        unique:true,
    } ,
    secondaryEmail:{
        type:String,
        //default:'NA'
    } ,
    contactNo:{
        type:Number,
        //default:0
    } ,
    password:{
        type:String,
        required:true
    } ,
    gender:{
        type:String,
        //default:'NA'
    } ,
    programme:{
        type:String,
        //default:'NA'
    } ,

    /*Server added field*/
    createdOn:{
        type:Date,
        required:true
    } ,
    userType: {
        type:String,
        required:true,
        default:userTypes.student
    },
    isActive:{
        type:Boolean,
        required:true,
        default:true
    } ,

    requestedServices: [{
        type: Schema.Types.ObjectId,
        ref: 'order',
    }],
    
    notifications: [{
        type: Schema.Types.ObjectId,
        ref: 'notification',
    }],
});

userSchema.pre('save', async function(next) {
    try{
        //generate a salt
        const salt = await bcrypt.genSalt();
        //generate password hash
        const passwordHashed = await bcrypt.hash(this.password,salt);
        //reassign hashed password
        this.password=passwordHashed;
        next();
    }catch(error){
        next(error);
    }
});

userSchema.methods.isValid = async function(newPassword){
    try{
        return await bcrypt.compare(newPassword,this.password);
    }catch(error){
        throw new Error(error);
    }
};


const User = moongose.model('user', userSchema);
module.exports = User;
