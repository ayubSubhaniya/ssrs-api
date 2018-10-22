const HttpStatus = require('http-status-codes');

const deliveryModel = require('../models/delivery');
const { resources } = require('../configuration');
const { accessControl } = require('./access');
const { filterResourceData, parseFilterQuery } = require('../helpers/controllerHelpers');

module.exports = {

    getAllCouriers: async(req, res, next) => {
        const { user } = req;
        const {daiictId} = user;

        const readAnyPermission = accessControl.can(user.userType)
            .readAny(resources.delivery);
        const readOwnPermission = accessControl.can(user.userType)
            .readOwn(resources.delivery);

        if(readAnyPermission.granted) {
            const query = parseFilterQuery(req.query, readAnyPermission.attributes);
            const requestedCouriers = await deliveryModel.find(query);

            if(requestedCouriers) {
                const filteredCouriers = filterResourceData(requestedCouriers, readAnyPermission.attributes);
                res.status(HttpStatus.OK)
                    .json({ delivery: filteredCouriers });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }
        }else if(readOwnPermission.granted) {
            const query = parseFilterQuery(req.query, readAnyPermission.attributes);
            query.createdBy = daiictId;
            const requestedCouriers = await deliveryModel.find(query);

            if(requestedCouriers) {
                const filteredCouriers = filterResourceData(requestedCouriers, readOwnPermission.attributes);
                res.status(HttpStatus.OK)
                    .json({ delivery: filteredCouriers });
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
            .readAny(resources.delivery);
        const readOwnPermission = accessControl.can(user.userType)
            .readOwn(resources.delivery);

        if(readAnyPermission.granted) {
            const requestedCourier = await deliveryModel.findById(requestedCourierId);

            if(requestedCourier) {
                const filteredCourier = filterResourceData(requestedCourier, readAnyPermission.attributes);
                res.status(HttpStatus.OK)
                    .json({ delivery: filteredCourier });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }
        } else if(readOwnPermission.granted) {
            const requestedCourier = await deliveryModel.findOne({
                _id:requestedCourierId,
                createdBy: daiictId
            });

            if(requestedCourier) {
                const filteredCourier = filterResourceData(requestedCourier, readOwnPermission.attributes);
                res.status(HttpStatus.OK)
                    .json({ delivery: filteredCourier });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },
};
