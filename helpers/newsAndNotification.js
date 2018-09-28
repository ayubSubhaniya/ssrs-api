const News = require('../models/news');
const Notification = require('../models/notification');

const generateNews = async (message, daiictId) => {
    const news = new News({
        message,
        createdOn: new Date(),
        createdBy: daiictId
    });
    await news.save();
};

const generateNotification = async (message, daiictId, userIds) => {

    if (userIds instanceof Array){
        userIds.forEach(async (userId) => {
            const notification = new Notification({
                message,
                createdOn: new Date(),
                createdBy: daiictId,
                userId
            });
            await notification.save();
        });
    } else if (userIds){
        const notification = new Notification({
            message,
            createdOn: new Date(),
            createdBy: daiictId,
            userIds
        });
        await notification.save();
    }

};

const generateServiceCreatedMessage = async (service, daiictId) => {
    const message = 'New service ' + service.name + ' created';

    if (service.isSpecialService) {
        await generateNotification(message, daiictId, service.specialServiceUsers);
    } else {
        await generateNews(message, daiictId);
    }
};


const generateServiceUpdatedMessage = async (service, daiictId) => {
    const message = 'Service ' + service.name + ' updated';

    if (service.isSpecialService) {
        await generateNotification(message, daiictId, service.specialServiceUsers);
    } else {
        await generateNews(message, daiictId);
    }
};
