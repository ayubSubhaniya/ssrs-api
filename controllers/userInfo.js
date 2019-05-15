const HttpStatus = require('http-status-codes');
const querystring = require('querystring');

const UserInfo = require('../models/userInfo');

const { resources, USER_PAGINATION_SIZE } = require('../configuration');
const { accessControl } = require('./access');
const { filterResourceData } = require('../helpers/controllerHelpers');

const getAllTypesDistinctValues = async () => {
    const batches = await UserInfo.find()
        .distinct('user_batch');
    const programmes = await UserInfo.find()
        .distinct('user_programme');
    const userTypes = await UserInfo.find()
        .distinct('user_type');
    const userStatus = await UserInfo.find()
        .distinct('user_status');
    return {
        batches,
        programmes,
        userTypes,
        userStatus
    };
};

module.exports = {
    getAllTypesDistinctValues,

    getAllUserInfo: async (req, res, next) => {
        const { user } = req;
        const pageNo = parseInt(req.query.pageNo || 1);
        const size = parseInt(req.query.size || USER_PAGINATION_SIZE);

        const readPermission = accessControl.can(user.userType)
            .readAny(resources.userInfo);

        if (readPermission.granted) {

            const totalCount = (await UserInfo.estimatedDocumentCount());
            const totalPages = Math.ceil(totalCount / size);

            if (pageNo < 0 || pageNo === 0) {
                return res.status(httpStatusCodes.BAD_REQUEST)
                    .send(errorMessages.invalidPageRequest);
            }

            const skip = size * (pageNo - 1);
            const limit = size;
            const sortQuery = {
                "user_inst_id": 1
            }

            const userInfoData = await UserInfo.find({})
                .skip(skip)
                .limit(limit)
                .sort(sortQuery);

            const filteredUserInfoData = filterResourceData(userInfoData, readPermission.attributes);
            const prevUrl = pageNo > 1 ? querystring.stringify({
                pageNo: pageNo - 1,
                size: size
            }) : undefined;
            const nextUrl = pageNo < totalPages ? querystring.stringify({
                pageNo: pageNo + 1,
                size: size
            }) : undefined;

            res.status(HttpStatus.OK)
                .json({ 
                    userInfo: filteredUserInfoData,
                    prev: prevUrl,
                    next: nextUrl
                });
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
                const { user_inst_id } = userInfo[i];
                bulk.find({ user_inst_id: user_inst_id })
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
        const values = getAllTypesDistinctValues()
        res.status(HttpStatus.OK)
            .json(values);
    },
};
