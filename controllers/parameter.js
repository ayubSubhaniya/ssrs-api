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
            
            const deletedParameter=await Parameter.findOneAndRemove({_id:requestedParameterId,createdBy:daiictId});
            
            if (deletedParameter){
                res.sendStatus(HttpStatus.ACCEPTED);
            } else {
                res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
            }
        }else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    getParameter: async (req, res, next) => {
        const {user} = req; 
        const { requestedParameterId } = req.params;

        const readPermission = accessControl.can(user.userType).readAny(resources.parameter);
        const readAnyInActiveResource = accessControl.can(user.userType).readAny(resources.inActiveResource);
        const readOwnInActiveResource = accessControl.can(user.userType).readOwn(resources.inActiveResource);

        if (readPermission.granted) {
            let requestedParameter;
            
            if (readAnyInActiveResource.granted){
                requestedParameter = await Parameter.findById(requestedParameterId);
            } else if (readOwnInActiveResource.granted){
                requestedParameter = await Parameter.findOne({_id:requestedParameterId,$or:[{createdBy:daiictId},{isActive:true}]});
            } else {
                requestedParameter = await Parameter.findOne({_id:requestedParameterId,isActive:true});
            }
            
            if (requestedParameter){
                const filteredParameter = filterResourceData(requestedParameter,readPermission.attributes);
                res.status(HttpStatus.ACCEPTED).json(filteredParameter);
            } else {
                res.sendStatus(HttpStatus.NO_CONTENT);
            }
            
        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    getAllParameter: async (req, res, next) => {
        const {user} = req; 

        const readPermission = accessControl.can(user.userType).readAny(resources.parameter);
        const readAnyInActiveResource = accessControl.can(user.userType).readAny(resources.inActiveResource);
        const readOwnInActiveResource = accessControl.can(user.userType).readOwn(resources.inActiveResource);

        if (readPermission.granted) {
            let requestedParameters ;

            if (readAnyInActiveResource.granted){
                requestedParameters = await Parameter.find({});
            } else if (readOwnInActiveResource.granted){
                requestedParameters = await Parameter.findMany({$or:[{createdBy:daiictId},{isActive:true}]});
            } else {
                requestedParameters = await Parameter.findMany({isActive:true});
            }
            
            if (requestedParameters){
                const filteredParameters = filterResourceData(requestedParameters,readPermission.attributes);
                res.status(HttpStatus.ACCEPTED).json(filteredParameters);
            } else {
                res.sendStatus(HttpStatus.NO_CONTENT);
            }
            
        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

    /**Add inactive no-update support */
    updateParameter: async (req, res, next) => {
        const {user} = req;
        const { requestedParameterId } = req.params;

        const updatePermission = accessControl.can(user.userType).updateAny(resources.parameter);
        const readPermission = accessControl.can(user.userType).readAny(resources.parameter);
        
        if (updatePermission.granted) {
            const updatedParameter = req.value.body;
            const result = await Parameter.findByIdAndUpdate(requestedParameterId, updatedParameter, {new:true});
            const filteredParameter = filterResourceData(result,readPermission.attributes);
            res.status(HttpStatus.ACCEPTED).json(filteredParameter);
            
        } else {
            res.sendStatus(HttpStatus.UNAUTHORIZED);
        }
    },

};
