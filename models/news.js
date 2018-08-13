const moongose = require('mongoose');

const { Schema } = moongose;

const newsSchema = new Schema({
    createdBy: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    createdOn: {
        type: Date,
        required: true,
    }
});


const News = moongose.model('news', newsSchema);
module.exports = News;
