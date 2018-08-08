const Joi = require('joi');

module.exports = {
    validateParam: (schema, name) => {
        return (req, res, next) => {
            const result = Joi.validate({ param: req['params'][name] }, schema);

            if (result.error) {
                // Error Happened
                return res.status(400).json(result.error);
            } else {
                
                // Add body in req.value
                if (!req.value) {
                    req.value = {};
                }
                if (!req.value['params']) {
                    req.value['params'] = {};
                }
                req.value['params'][name] = result.value.param;
                next();
            }
        };
    },

    validateBody: (schema) => {
        return (req, res, next) => {
            const result = Joi.validate(req.body, schema);
            if (result.error) {
                return res.status(400).json(result.error);
            } else {
                if (!req.value) {
                    req.value = {};
                }
                if (!req.value['body']) {
                    req.value['body'] = {};
                }
                req.value['body'] = result.value;
                next();
            }
        };
    },

    schemas: {
        authSchema : Joi.object().keys({
            daiictId: Joi.number().required(),
            password: Joi.string().required(),
        }),
        addUserByAdminSchema: Joi.object().keys({
            daiictId: Joi.number().required(),
            password: Joi.string().required(),
            name: {
                firstName : Joi.string(),
                lastName : Joi.string(),
            },
            primaryEmail:Joi.string().email(),
            secondaryEmail:Joi.string().email(),
            contactNo: Joi.number(),
            password: Joi.string(),
            gender: Joi.string(),
            programme: Joi.string(),
            createdOn: Joi.date(),
            userType:Joi.string().required(),
            isActive:Joi.boolean(),
        }),
        userUpdateSchema : Joi.object().keys({
            daiictId: Joi.number(),
            password: Joi.string(),
            name: {
                firstName : Joi.string(),
                lastName : Joi.string(),
            },
            primaryEmail:Joi.string().email(),
            secondaryEmail:Joi.string().email(),
            contactNo: Joi.number(),
            password: Joi.string(),
            gender: Joi.string(),
            programme: Joi.string(),
            createdOn: Joi.date(),
            userType:Joi.string(),
            isActive:Joi.boolean(),
        }),
        daiictIdSchema: Joi.object().keys({
            param: Joi.number().required(),
        }),
        idSchema: Joi.object().keys({
            param: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
        }),
        serviceSchema: Joi.object().keys({
            name: Joi.string().required(),
            description: Joi.string(),
            department: Joi.string(),
            isApplicationSpecific: Joi.boolean(),
            isSpecialService: Joi.boolean(),
            isAvailableForAlumni: Joi.boolean(),
            isCourierAvailable: Joi.boolean(),
            isActive:Joi.boolean(),
            maxUnits: Joi.number(),
            baseCharge: Joi.number(),
            availableParameters: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)),
        }),
        parameterSchema: Joi.object().keys({
            name: Joi.string().required(),
            description: Joi.string(),
            baseCharge: Joi.number(),
        }),
        parameterUpdateSchema: Joi.object().keys({
            name: Joi.string(),
            description: Joi.string(),
            baseCharge: Joi.number(),
        }),
        notificationSchema: Joi.object().keys({
            message: Joi.string().required(),
            userId : Joi.number().required()
        }),
        notificationUpdateSchema: Joi.object().keys({
            message: Joi.string(),
            userId : Joi.number()
        }),
        serviceEditSchema: Joi.object().keys({
            name: Joi.string(),
            description: Joi.string(),
            department: Joi.string(),
            isApplicationSpecific: Joi.boolean(),
            isSpecialService: Joi.boolean(),
            isAvailableForAlumni: Joi.boolean(),
            isCourierAvailable: Joi.boolean(),
            maxUnits: Joi.number(),
            baseCharge: Joi.number(),
            availableParameters: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)),
        }),
    },
};
