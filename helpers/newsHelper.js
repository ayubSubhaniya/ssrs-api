const News = require('../models/news');

const generateNews = async (message, daiictId, serviceId=undefined) => {
    const news = new News({
        message,
        createdOn: new Date(),
        createdBy: daiictId,
        serviceId: (serviceId ? serviceId.toString() : undefined)
    });
    await news.save();
};

module.exports = {
    generateNews
}