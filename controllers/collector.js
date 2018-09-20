const HttpStatus = require('http-status-codes');

const collectorModel = require('../models/collector');
const { resources } = require('../configuration');
const { accessControl } = require('./access');
const { filterResourceData, parseFilterQuery } = require('../helpers/controllerHelpers');

module.exports = {

    getCollectorByCollectionCode: async(req, res, next) => {
        const { user } = req;

        const readPermission = accessControl.can(user.userType)
            .readAny(resources.collector);

        if(readPermission.granted) {
            const query = parseFilterQuery(req.query, readPermission.attributes);
            let requestedCollectors = await collectorModel.find(query);

            if(requestedCollectors) {
                const filteredCollectors = filterResourceData(requestedCollectors, readPermission.attributes);
                res.status(HttpStatus.ACCEPTED)
                    .json({ collector: filteredCollectors });
            } else {
                res.sendStatus(HttpStatus.NO_CONTENT);
            }
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    getCollector: async(req, res, next) => {
        const { user } = req;
        const { requestedCollectorId } = req.params;

        const readPermission = accessControl.can(user.userType)
            .readAny(resources.collector);

        if(readPermission.granted) {
            let requestedCollectors = await collectorModel.findById(requestedCollectorId);

            if(requestedCollectors) {
                const filteredCollectors = filterResourceData(requestedCollectors, readPermission.attributes);
                res.status(HttpStatus.ACCEPTED)
                    .json({ collector: filteredCollectors });
            } else {
                res.sendStatus(HttpStatus.NO_CONTENT);
            }
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    updateCollector: async(req, res, next) => {
        const { user } = req;
        const { requestedCollectorId } = req.params;

        const readPermission = accessControl.can(user.userType)
            .readAny(resources.collector);
        const updatePermission = accessControl.can(user.userType)
            .updateAny(resources.collector);

        if (updatePermission.granted) {
            const updatedCollectorInfo = req.value.body;
            const modifiedCollectorInfo = await collectorModel.findByIdAndUpdate(requestedCollectorId, updatedCollectorInfo, { new: true });
            const filteredCollector = filterResourceData(modifiedCollectorInfo, readPermission.attributes);
            res.status(HttpStatus.ACCEPTED)
                .json({ collector: filteredCollector });
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },
};
