const moongose = require('mongoose');
const Schema = moongose.Schema;

const userInfoSchema = new Schema({
    user_inst_id: {
        type: String,
    },
    user_id: {
        type: String,
    },
    user_type: {
        type: String,
    },
    user_first_name: {
        type: String,
    },
    user_middle_name:{
        type:String,
    },
    user_last_name: {
        type: String,
    },
    user_sex: {
        type: String,
    },
    user_email_id: {
        type: String,
        unique: true,
        required: true,
    },
    user_status: {
        type: String,
    },
    user_adr_contact_name: {
        type: String,
    },
    user_adr_line1: {
        type: String,
    },
    user_adr_line2: {
        type: String
    },
    user_adr_line3: {
        type: String
    },
    user_adr_city: {
        type: String,
    },
    user_adr_district: {
        type: String,
    },
    user_adr_state: {
        type: String,
    },
    user_adr_country: {
        type: String,
    },
    user_adr_pincode: {
        type: String,
    },
    user_adr_telno: {
        type: String,
    },
    user_adr_mobileno: {
        type: String,
    },
    user_adr_emailid: {
        type: String,
    },
    user_batch:{
        type:String,
    },
    user_programme:{
        type:String,
    }
});

const UserInfo = moongose.model('userinfo', userInfoSchema);

userInfoSchema.pre('save',function (next) {
    this.user_type = this.user_type.toUpperCase();
    this.user_status = this.user_status.toUpperCase();
    next();
});
module.exports = UserInfo;
