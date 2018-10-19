const HttpStatus = require('http-status-codes');

const UserInfo = require('../models/userInfo');

const { resources } = require('../configuration');
const { accessControl } = require('./access');
const { filterResourceData } = require('../helpers/controllerHelpers');

module.exports = {

    getAllUserInfo: async (req, res, next) => {
        const { user } = req;

        const readPermission = accessControl.can(user.userType)
            .readAny(resources.userInfo);
        
        if(readPermission.granted) {
            const userInfoData = await UserInfo.find({});
            const filteredUserInfoData = filterResourceData(userInfoData, readPermission.attributes);
            res.status(HttpStatus.OK)
                .json({ userInfo: filteredUserInfoData });
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    addUpdateUserInfo: async (req, res, next) => {

        const { user } = req;
        
        const readPermission = accessControl.can(user.userType)
            .readAny(resources.userInfo);
        const createPermission = accessControl.can(user.userType)
            .createAny(resources.userInfo);
        const updatePermission = accessControl.can(user.userType)
            .updateAny(resources.userInfo);
        
        if(readPermission.granted && createPermission.granted && updatePermission.granted) {

            const { userInfo } = req.value.body;
            let bulk = UserInfo.collection.initializeUnorderedBulkOp();

            for(let i=0; i<userInfo.length; i++) {
                const { user_email_id } = userInfo[i];
                // await UserInfo.findOneAndUpdate({user_inst_id: user_inst_id}, userInfo[i], {upsert: true});
                bulk.find( {user_email_id: user_email_id} ).upsert().updateOne(userInfo[i]);
            }

            bulk.execute();
            res.sendStatus(HttpStatus.OK);

        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },
}