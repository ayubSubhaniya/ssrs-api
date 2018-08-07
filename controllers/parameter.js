const HttpStatus = require('http-status-codes');

const Parameter = require('../models/parameter');
const {resources} = require('../configuration');
const {accessControl} = require('./access')
const {filterResourceData} = require('../helpers/controllerHelpers')

module.exports = {

    addParameter: async (req, res, next) => {
        const {user} = req; 
        const {daiictId} = user;
        const createPermission = accessControl.can(user.userType).createAny(resources.parameter);
        const readPermission = accessControl.can(user.userType).readAny(resources.parameter);
        if (createPermission.granted) {
            let parameterAtt = req.value.body;
            parameterAtt.createdOn =  new Date();
            parameterAtt.createdBy = daiictId;
            
            const newParameter = new Parameter(parameterAtt);
            const parameter = await newParameter.save();

            const filteredParameter = filterResourceData(parameter,readPermission.attributes);
            res.status(HttpStatus.CREATED).json(filteredParameter);
        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    deleteParameter: async (req, res, next) => {
        const {user} = req; 
        const {daiictId} = user;
        const { requestedParameterId } = req.params;

        const deleteAnyPermission = accessControl.can(user.userType).deleteAny(resources.parameter);
        const deleteOwnPermission = accessControl.can(user.userType).deleteOw(resources.parameter);

        
        if (deleteAnyPermission.granted) {
            
            await Parameter.findByIdAndRemove(requestedParameterId);
            res.sendStatus(HttpStatus.ACCEPTED);
        } else if (deleteOwnPermission.granted){
            
            const parameter = await Parameter.findById(requestedParameterId);

            if (parameter.createdBy==daiictId){
                await Parameter.findByIdAndRemove(requestedParameterId);
                res.sendStatus(HttpStatus.ACCEPTED);
                
            } else {
                res.sendStatus(HttpStatus.UNAUTHORIZED);
            }
        }else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    getParameter: async (req, res, next) => {
        const {user} = req; 
        const { requestedParameterId } = req.params;

        const readPermission = accessControl.can(user.userType).readAny(resources.parameter);
        if (readPermission.granted) {
            const requestedParameter = await Parameter.findById(requestedParameterId);
            
            const filteredParameter = filterResourceData(requestedParameter,readPermission.attributes);
            res.status(HttpStatus.ACCEPTED).json(filteredParameter);
            
        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    getAllParameter: async (req, res, next) => {
        const {user} = req; 

        const readPermission = accessControl.can(user.userType).readAny(resources.parameter);
        if (readPermission.granted) {
            const requestedParameters = await Parameter.find({});
            const filteredParameters = filterResourceData(requestedParameters,readPermission.attributes);
            res.status(HttpStatus.ACCEPTED).json(filteredParameters);
            
        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    updateParameter: async (req, res, next) => {
        const {user} = req;
        const { requestedParameterId } = req.params;

        const updatePermission = accessControl.can(user.userType).updateAny(resources.parameter);
        const readPermission = accessControl.can(user.userType).readAny(resources.parameter);
        if (updatePermission.granted) {
            const updatedParameter = req.body;
            const result = await Parameter.findByIdAndUpdate(requestedParameterId, updatedParameter, {new:true});
            const filteredParameter = filterResourceData(result,readPermission.attributes);
            res.status(HttpStatus.ACCEPTED).json(filteredParameter);
            
        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

};
