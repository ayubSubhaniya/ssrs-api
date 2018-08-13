const moongose = require('mongoose');

const { Schema } = moongose;

const newsSchema = new Schema({
    createdBy: {
        type: Number,
    },
    message: {
        type: String
    },
    createdOn: {
        type: Date,
        default: new Date()
    }
});


const News = moongose.model('news', newsSchema);
module.exports = News;
