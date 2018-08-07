const HttpStatus = require('http-status-codes');

const { filterResourceData } = require('../helpers/controllerHelpers');
const News = require('../models/news');
const { NEWS_EXPIRY_TIME, resources, errors } = require('../configuration');
const { accessControl } = require('./access');
const User = require('../models/user');

module.exports = {
    getAllNews: async (req, res, next) => {
        const {user} = req; 

        const readPermission = accessControl.can(user.userType).readAny(resources.news);
        if (readPermission.granted) {

            var startDate = new Date()
            startDate.setDate(startDate.getDate() - NEWS_EXPIRY_TIME)
            const news = await News.find({
                createdOn: {
                    "$gte": startDate, "$lt": new Date()
                }
            });

            const filteredNews = filterResourceData(news, readPermission.attributes);
            res.status(HttpStatus.ACCEPTED).json(filteredNews);
        } else {
            res.status(HttpStatus.UNAUTHORIZED).json({ error: errors.permissionDenied });
        }
    },

    getNewsCreatedByMe: async (req, res, next) => {
        const {user} = req; 
        const { daiictId } = user;

        const readPermission = accessControl.can(user.userType).readOwn(resources.news);
        if (readPermission.granted) {
            var startDate = new Date()
            startDate.setDate(startDate.getDate() - NEWS_EXPIRY_TIME)

            const news = await News.find({
                createdOn: {
                    "$gte": startDate, "$lt": new Date()
                },
                createdBy: daiictId,
            });

            const filteredNews = filterResourceData(news, readPermission.attributes);
            res.status(HttpStatus.ACCEPTED).json(filteredNews);
        } else {
            res.status(HttpStatus.UNAUTHORIZED).json({ error: errors.permissionDenied });
        }
    },

    addNews: async (req, res, next) => {
        const {user} = req; 
        const { daiictId } = user;

        const createPermission = accessControl.can(user.userType).createOwn(resources.news);
        const readPermission = accessControl.can(user.userType).readOwn(resources.news);
        if (createPermission.granted) {
            const { message } = req.body
            const createdOn = new Date()
            const newNews = new News({
                message,
                createdOn,
                createdBy: daiictId
            });
            const news = await newNews.save()

            const filteredNews = filterResourceData(news, readPermission.attributes);
            res.status(HttpStatus.ACCEPTED).json(filteredNews);
        } else {
            res.status(HttpStatus.UNAUTHORIZED).json({ error: errors.permissionDenied });
        }
    },

    deleteNews: async (req, res, next) => {
        const {user} = req;
        const { newsId } = req.params;
        const news = await News.findById(newsId);

        if (accessControl.can(user.userType).deleteAny(resources.news) || (accessControl.can(user.userType).deleteOwn(resources.news) && news.createdBy == userId)) {
            await News.findByIdAndRemove(newsId)
            res.status(HttpStatus.ACCEPTED).json({ success: true });
        } else {
            res.status(HttpStatus.UNAUTHORIZED).json({ error: errors.permissionDenied });
        }
    },

    deleteAllNews: async (req, res, next) => {
        const {user} = req; 

        const deletePermission = accessControl.can(user.userType).deleteAny(resources.news);
        if (deletePermission.granted) {
            await News.deleteMany({})
            res.status(HttpStatus.ACCEPTED).json({ success: true })
        } else {
            res.status(HttpStatus.UNAUTHORIZED).json({ error: errors.permissionDenied });
        }
    },

    deleteNewsCreatedByMe: async (req, res, next) => {
        const {user} = req; 
        const { daiictId } = user;

        const deletePermission = accessControl.can(user.userType).deleteOwn(resources.news);
        if (deletePermission.granted) {
            const result=await News.deleteMany({ createdBy: daiictId });
            res.status(HttpStatus.ACCEPTED).json({ success: true })
        } else {
            res.status(HttpStatus.UNAUTHORIZED).json({ error: errors.permissionDenied });
        }
    },

    getNews: async (req, res, next) => {
        const {user} = req; 
        const { newsId } = req.params;
        const news = await News.findById(newsId);

        const readAnyPermission = accessControl.can(user.userType).readAny(resources.news);
        const readOwnPermission = accessControl.can(user.userType).readOwn(resources.news);
        if (readAnyPermission.granted) {
            const filteredNews = filterResourceData(news, readAnyPermission.attributes);
            res.status(HttpStatus.ACCEPTED).json(filteredNews);
        } else if (readOwnPermission.granted && news.createdBy == userId) {
            const filteredNews = filterResourceData(news, readOwnPermission.attributes);
            res.status(HttpStatus.ACCEPTED).json(filteredNews);
        } else {
            res.status(HttpStatus.UNAUTHORIZED).json({ error: errors.permissionDenied });
        }
    },

    replaceNews: async (req, res, next) => {
        const {user} = req; 
        const { daiictId } = user;
        const { newsId } = req.params;
        const news = await News.findById(newsId);

        const updateAnyPermission = accessControl.can(user.userType).updateAny(resources.news);
        const updateOwnPermission = accessControl.can(user.userType).updateOwn(resources.news);
        const readAnyPermission = accessControl.can(user.userType).readAny(resources.news);
        const readOwnPermission = accessControl.can(user.userType).readOwn(resources.news);

        if (updateAnyPermission.granted) {
            
            let newNews = filterResourceData(req.body,updateAnyPermission.attributes)
            newNews['createdOn']=new Date();
            newNews['createdBy']=daiictId;
            await News.replaceOne({ _id: newsId }, newNews, { new: true });
            
            const result = await News.findById(newsId);
            const filteredNews = filterResourceData(result, readAnyPermission.attributes);
            res.status(HttpStatus.ACCEPTED).json(filteredNews);
        } else if (updateOwnPermission.granted&& news.createdBy == userId){
            
            let newNews = filterResourceData(req.body,updateAnyPermission.attributes)
            newNews['createdOn']=new Date();
            newNews['createdBy']=daiictId;
            await News.replaceOne({ _id: newsId }, newNews, { new: true });
            
            const result = await News.findById(newsId);
            const filteredNews = filterResourceData(result, readOwnPermission.attributes);
            res.status(HttpStatus.ACCEPTED).json(filteredNews);
        }else {
            res.status(HttpStatus.UNAUTHORIZED).json({ error: errors.permissionDenied });
        }
    },

    updateNews: async (req, res, next) => {
        const {user} = req; 
        const { newsId } = req.params;
        const news = await News.findById(newsId);

        const updateAnyPermission = accessControl.can(user.userType).updateAny(resources.news);
        const updateOwnPermission = accessControl.can(user.userType).updateOwn(resources.news);
        const readAnyPermission = accessControl.can(user.userType).readAny(resources.news);
        const readOwnPermission = accessControl.can(user.userType).readOwn(resources.news);
        
        if (updateAnyPermission.granted) {
            
            let newNews = filterResourceData(req.body,updateAnyPermission.attributes)
            newNews['createdOn']=new Date();
            
            const result = await News.findByIdAndUpdate(newsId, newNews, { new: true })
            const filteredNews = filterResourceData(result, readAnyPermission.attributes);
            
            res.status(HttpStatus.ACCEPTED).json(filteredNews);

        } else if (updateOwnPermission.granted&& news.createdBy == userId){
            
            let newNews = filterResourceData(req.body,updateAnyPermission.attributes)
            newNews['createdOn']=new Date();

            const result = await News.findByIdAndUpdate(newsId, newNews, { new: true })
            const filteredNews = filterResourceData(result, readOwnPermission.attributes);
            
            res.status(HttpStatus.ACCEPTED).json(filteredNews);

        }else {
            res.status(HttpStatus.UNAUTHORIZED).json({ error: errors.permissionDenied });
        }
    },
}