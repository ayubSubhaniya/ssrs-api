const HttpStatus = require('http-status-codes');

const Parameter = require('../models/parameter');
const { resources } = require('../configuration');
const { accessControl } = require('./access');
const { filterResourceData } = require('../helpers/controllerHelpers');

module.exports = {

    addParameter: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;

        const createPermission = accessControl.can(user.userType)
            .createAny(resources.parameter);
        const readPermission = accessControl.can(user.userType)
            .readAny(resources.parameter);

        if (createPermission.granted) {
            let parameterAtt = req.value.body;
            parameterAtt.createdOn = new Date();
            parameterAtt.createdBy = daiictId;

            const newParameter = new Parameter(parameterAtt);
            const parameter = await newParameter.save();

            const filteredParameter = filterResourceData(parameter, readPermission.attributes);
            res.status(HttpStatus.CREATED)
                .json({ parameter: filteredParameter });
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    deleteParameter: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { requestedParameterId } = req.params;

        const deleteAnyPermission = accessControl.can(user.userType)
            .deleteAny(resources.parameter);
        const deleteOwnPermission = accessControl.can(user.userType)
            .deleteOwn(resources.parameter);


        if (deleteAnyPermission.granted) {

            await Parameter.findByIdAndRemove(requestedParameterId);
            res.sendStatus(HttpStatus.OK);
        } else if (deleteOwnPermission.granted) {

            const deletedParameter = await Parameter.findOneAndRemove({
                _id: requestedParameterId,
                createdBy: daiictId
            });

            if (deletedParameter) {
                res.sendStatus(HttpStatus.OK);
            } else {
                res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
            }
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    getParameter: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { requestedParameterId } = req.params;

        const readPermission = accessControl.can(user.userType)
            .readAny(resources.parameter);
        const readAnyInActiveResource = accessControl.can(user.userType)
            .readAny(resources.inActiveResource);
        const readOwnInActiveResource = accessControl.can(user.userType)
            .readOwn(resources.inActiveResource);

        if (readPermission.granted) {
            let requestedParameter;

            if (readAnyInActiveResource.granted) {
                requestedParameter = await Parameter.findById(requestedParameterId);
            } else if (readOwnInActiveResource.granted) {
                requestedParameter = await Parameter.findOne({
                    _id: requestedParameterId,
                    $or: [{ createdBy: daiictId }, { isActive: true }]
                });
            } else {
                requestedParameter = await Parameter.findOne({
                    _id: requestedParameterId,
                    isActive: true
                });
            }

            if (requestedParameter) {
                const filteredParameter = filterResourceData(requestedParameter, readPermission.attributes);
                res.status(HttpStatus.OK)
                    .json({ parameter: filteredParameter });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }

        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    getAllParameter: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;

        const readPermission = accessControl.can(user.userType)
            .readAny(resources.parameter);
        const readAnyInActiveResource = accessControl.can(user.userType)
            .readAny(resources.inActiveResource);
        const readOwnInActiveResource = accessControl.can(user.userType)
            .readOwn(resources.inActiveResource);

        if (readPermission.granted) {
            let requestedParameters;

            if (readAnyInActiveResource.granted) {
                requestedParameters = await Parameter.find({});
            } else if (readOwnInActiveResource.granted) {
                requestedParameters = await Parameter.find({ $or: [{ createdBy: daiictId }, { isActive: true }] });
            } else {
                requestedParameters = await Parameter.find({ isActive: true });
            }

            if (requestedParameters) {
                const filteredParameters = filterResourceData(requestedParameters, readPermission.attributes);
                res.status(HttpStatus.OK)
                    .json({ parameter: filteredParameters });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }

        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    changeStatus: async (req, res, next) => {
        const { user } = req;
        const { parameterId } = req.params;

        const changeStatusPermission = accessControl.can(user.userType)
            .updateAny(resources.changeResourceStatus);
        const readPermission = accessControl.can(user.userType)
            .readAny(resources.parameter);

        if (changeStatusPermission.granted) {
            const parameterUpdateAtt = req.value.body;
            const updatedParameter = await Parameter.findByIdAndUpdate(parameterId, parameterUpdateAtt, { new: true });

            if (updatedParameter) {
                const filteredParameter = filterResourceData(updatedParameter, readPermission.attributes);
                res.status(HttpStatus.OK)
                    .json({ parameter: filteredParameter });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    /**Add inactive no-update support */
    updateParameter: async (req, res, next) => {
        const { user } = req;
        const { requestedParameterId } = req.params;

        const updatePermission = accessControl.can(user.userType)
            .updateAny(resources.parameter);
        const readPermission = accessControl.can(user.userType)
            .readAny(resources.parameter);

        if (updatePermission.granted) {
            const updatedParameter = req.value.body;
            const result = await Parameter.findByIdAndUpdate(requestedParameterId, updatedParameter, { new: true });
            const filteredParameter = filterResourceData(result, readPermission.attributes);
            res.status(HttpStatus.OK)
                .json({ parameter: filteredParameter });

        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

};
