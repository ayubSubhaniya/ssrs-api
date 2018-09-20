const HttpStatus = require('http-status-codes');

const courierModel = require('../models/courier');
const { resources } = require('../configuration');
const { accessControl } = require('./access');
const { filterResourceData } = require('../helpers/controllerHelpers');

module.exports = {

    getAllCouriers: async(req, res, next) => {
        const { user } = req;

        const readPermission = accessControl.can(user.userType)
            .readAny(resources.courier);

        if(readPermission.granted) {
            let requestedCouriers = await courierModel.find({});

            if(requestedCouriers) {
                const filteredCouriers = filterResourceData(requestedCouriers, readPermission.attributes);
                res.status(HttpStatus.ACCEPTED)
                    .json({ courier: filteredCouriers });
            } else {
                res.sendStatus(HttpStatus.NO_CONTENT);
            }
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    getCourier: async(req, res, next) => {
        const { user } = req;
        const { requestedCourierId } = req.params;

        const readPermission = accessControl.can(user.userType)
            .readAny(resources.courier);

        if(readPermission.granted) {
            let requestedCouriers = await courierModel.findById(requestedCourierId);

            if(requestedCouriers) {
                const filteredCouriers = filterResourceData(requestedCouriers, readPermission.attributes);
                res.status(HttpStatus.ACCEPTED)
                    .json({ courier: filteredCouriers });
            } else {
                res.sendStatus(HttpStatus.NO_CONTENT);
            }
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    updateCourier: async(req, res, next) => {
        const { user } = req;
        const { requestedCourierId } = req.params;

        const readPermission = accessControl.can(user.userType)
            .readOwn(resources.courier);
        const updatePermission = accessControl.can(user.userType)
            .updateOwn(resources.courier);

        if (updatePermission.granted) {
            const updatedCourierInfo = req.value.body;
            const modifiedCourierInfo = await courierModel.findByIdAndUpdate(requestedCourierId, updatedCourierInfo, { new: true });
            const filteredCourier = filterResourceData(modifiedCourierInfo, readPermission.attributes);
            res.status(HttpStatus.ACCEPTED)
                .json({ courier: filteredCourier });
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },
};
