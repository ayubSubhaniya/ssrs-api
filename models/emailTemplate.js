const moongose = require('mongoose');
const Schema = moongose.Schema;

const emailTemplateSchema = new Schema({
    data: {
        type: String,
        required: true
    },
    lastModified: {
        type: Date,
        required: true
    },
    modifiedBy: {
        type: String,
        required: true
    }
});