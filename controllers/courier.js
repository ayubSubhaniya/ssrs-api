const HttpStatus = require('http-status-codes');

const courierModel = require('../models/courier');
const { resources } = require('../configuration');
const { accessControl } = require('./access');
const { filterResourceData, parseFilterQuery } = require('../helpers/controllerHelpers');

module.exports = {

    getAllCouriers: async(req, res, next) => {
        const { user } = req;
        const {daiictId} = user;

        const readAnyPermission = accessControl.can(user.userType)
            .readAny(resources.courier);
        const readOwnPermission = accessControl.can(user.userType)
            .readOwn(resources.courier);

        if(readAnyPermission.granted) {
            const query = parseFilterQuery(req.query, readAnyPermission.attributes);
            const requestedCouriers = await courierModel.find(query);

            if(requestedCouriers) {
                const filteredCouriers = filterResourceData(requestedCouriers, readAnyPermission.attributes);
                res.status(HttpStatus.OK)
                    .json({ courier: filteredCouriers });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }
        }else if(readOwnPermission.granted) {
            const query = parseFilterQuery(req.query, readAnyPermission.attributes);
            query.createdBy = daiictId;
            const requestedCouriers = await courierModel.find(query);

            if(requestedCouriers) {
                const filteredCouriers = filterResourceData(requestedCouriers, readOwnPermission.attributes);
                res.status(HttpStatus.OK)
                    .json({ courier: filteredCouriers });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    getCourier: async(req, res, next) => {
        const { user } = req;
        const {daiictId} = user;
        const { requestedCourierId } = req.params;

        const readAnyPermission = accessControl.can(user.userType)
            .readAny(resources.courier);
        const readOwnPermission = accessControl.can(user.userType)
            .readOwn(resources.courier);

        if(readAnyPermission.granted) {
            const requestedCourier = await courierModel.findById(requestedCourierId);

            if(requestedCourier) {
                const filteredCourier = filterResourceData(requestedCourier, readAnyPermission.attributes);
                res.status(HttpStatus.OK)
                    .json({ courier: filteredCourier });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }
        } else if(readOwnPermission.granted) {
            const requestedCourier = await courierModel.findOne({
                _id:requestedCourierId,
                createdBy: daiictId
            });

            if(requestedCourier) {
                const filteredCourier = filterResourceData(requestedCourier, readOwnPermission.attributes);
                res.status(HttpStatus.OK)
                    .json({ courier: filteredCourier });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },
};
