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

        if (readPermission.granted) {
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

        if (readPermission.granted && createPermission.granted && updatePermission.granted) {

            const { userInfo } = req.value.body;
            let bulk = UserInfo.collection.initializeUnorderedBulkOp();

            for (let i = 0; i < userInfo.length; i++) {
                const { user_email_id } = userInfo[i];
                bulk.find({ user_email_id: user_email_id })
                    .upsert()
                    .updateOne(userInfo[i]);
            }

            await bulk.execute();

            res.status(HttpStatus.OK)
                .json({});

        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    getDistinctValues: async (req, res, next) => {
        const batches = await UserInfo.find()
            .distinct('user_batch');
        const programmes = await UserInfo.find()
            .distinct('user_programme');
        const userTypes = await UserInfo.find()
            .distinct('user_type');
        const userStatus = await UserInfo.find()
            .distinct('user_status');
        res.status(HttpStatus.OK)
            .json({
                batches,
                programmes,
                userTypes,
                userStatus
            });
    },
};
