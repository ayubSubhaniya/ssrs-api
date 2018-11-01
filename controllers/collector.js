const HttpStatus = require('http-status-codes');

const collectorModel = require('../models/collector');
const { resources } = require('../configuration');
const { accessControl } = require('./access');
const { filterResourceData, parseFilterQuery } = require('../helpers/controllerHelpers');

module.exports = {

    getCollectorByCollectionCode: async (req, res, next) => {
        const { user } = req;

        const readPermission = accessControl.can(user.userType)
            .readAny(resources.collector);

        if (readPermission.granted) {
            const query = parseFilterQuery(req.query, readPermission.attributes);
            const requestedCollectors = await collectorModel.find(query);

            if (requestedCollectors) {
                const filteredCollectors = filterResourceData(requestedCollectors, readPermission.attributes);
                res.status(HttpStatus.OK)
                    .json({ collector: filteredCollectors });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },

    getCollector: async (req, res, next) => {
        const { user } = req;
        const { daiictId } = user;
        const { requestedCollectorId } = req.params;

        const readAnyPermission = accessControl.can(user.userType)
            .readAny(resources.collector);
        const readOwnPermission = accessControl.can(user.userType)
            .readOwn(resources.collector);

        if (readAnyPermission.granted) {
            const requestedCollector = await collectorModel.findById(requestedCollectorId);

            if (requestedCollector) {
                const filteredCollector = filterResourceData(requestedCollector, readAnyPermission.attributes);
                res.status(HttpStatus.OK)
                    .json({ collector: filteredCollector });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }
        } else if (readOwnPermission.granted) {
            const requestedCollector = await collectorModel.findOne({
                _id: requestedCollectorId,
                createdBy: daiictId
            });

            if (requestedCollector) {
                const filteredCollector = filterResourceData(requestedCollector, readOwnPermission.attributes);
                res.status(HttpStatus.OK)
                    .json({ collector: filteredCollector });
            } else {
                res.sendStatus(HttpStatus.NOT_FOUND);
            }
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },
};
