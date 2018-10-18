const moongose = require('mongoose');
const Schema = moongose.Schema;

const userInfoSchema = new Schema({
    user_inst_id:           { type: String, required: true },
    user_type:              { type: String, required: true },
    user_first_name:        { type: String, required: true },
    user_last_name:         { type: String, required: true },
    user_sex:               { type: String, required: true },
    user_email_id:          { type: String, required: true },
    user_status:            { type: String, required: true },
    user_adr_contact_name:  { type: String, required: true },
    user_adr_line1:         { type: String, required: true },
    user_adr_line2:         { type: String },
    user_adr_line3:         { type: String },
    user_adr_city:          { type: String, required: true },
    user_adr_district:      { type: String, required: true },
    user_adr_state:         { type: String, required: true },
    user_adr_country:       { type: String, required: true },
    user_adr_pincode:       { type: String, required: true },
    user_adr_telno:         { type: String, required: true },
    user_adr_mobileno:      { type: String, required: true },
    user_adr_emailid:       { type: String, required: true },
});

const UserInfo = moongose.model('userinfo', userInfoSchema);
module.exports = UserInfo;