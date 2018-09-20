const Joi = require('joi');

module.exports = {
    validateParam: (schema, name) => {
        return (req, res, next) => {
            const result = Joi.validate({ param: req['params'][name] }, schema);

            if (result.error) {
                // Error Happened
                return res.status(400)
                    .json(result.error);
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
                return res.status(400)
                    .json(result.error);
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
        authSchema: Joi.object()
            .keys({
                daiictId: Joi.string()
                    .required(),
                password: Joi.string()
                    .required(),
            }),
        changePasswordSchema: Joi.object()
            .keys({
                daiictId: Joi.string()
                    .required(),
                password: Joi.string()
                    .required(),
                newPassword: Joi.string()
                    .required(),
            }),
        addUserSchema: Joi.object()
            .keys({
                daiictId: Joi.string()
                    .required(),
                password: Joi.string()
                    .required(),
                name: {
                    firstName: Joi.string(),
                    lastName: Joi.string(),
                },
                secondaryEmail: Joi.string()
                    .email(),
                contactNo: Joi.number(),
                gender: Joi.string(),
                programme: Joi.string(),
                userType: Joi.string()
                    .required(),
                isActive: Joi.boolean(),
            }),
        updateUserSchema: Joi.object()
            .keys({
                name: {
                    firstName: Joi.string(),
                    lastName: Joi.string(),
                },
                secondaryEmail: Joi.string()
                    .email(),
                contactNo: Joi.number(),
                gender: Joi.string(),
                programme: Joi.string(),
                userType: Joi.string(),
            }),
        daiictIdSchema: Joi.object()
            .keys({
                param: Joi.string()
                    .required(),
            }),
        idSchema: Joi.object()
            .keys({
                param: Joi.string()
                    .regex(/^[0-9a-fA-F]{24}$/)
                    .required(),
            }),
        serviceSchema: Joi.object()
            .keys({
                name: Joi.string()
                    .required(),
                description: Joi.string(),
                department: Joi.string(),
                isApplicationSpecific: Joi.boolean(),
                isSpecialService: Joi.boolean(),
                isAvailableForAlumni: Joi.boolean(),
                isCourierAvailable: Joi.boolean(),
                isActive: Joi.boolean(),
                maxUnits: Joi.number(),
                baseCharge: Joi.number(),
                availableParameters: Joi.array()
                    .items(Joi.string()
                        .regex(/^[0-9a-fA-F]{24}$/)),
                collectionTypes: Joi.array()
                    .items(Joi.string()
                        .regex(/^[0-9a-fA-F]{24}$/)),
                paymentModes: {
                    debitCard: Joi.boolean(),
                    netBanking: Joi.boolean(),
                    paytm: Joi.boolean(),
                    cashOnDelivery: Joi.boolean(),
                },
                specialServiceUsers: Joi.array()
                    .items(Joi.number()),
            }),
        serviceUpdateSchema: Joi.object()
            .keys({
                name: Joi.string(),
                description: Joi.string(),
                department: Joi.string(),
                isApplicationSpecific: Joi.boolean(),
                isSpecialService: Joi.boolean(),
                isAvailableForAlumni: Joi.boolean(),
                isCourierAvailable: Joi.boolean(),
                maxUnits: Joi.number(),
                baseCharge: Joi.number(),
                availableParameters: Joi.array()
                    .items(Joi.string()
                        .regex(/^[0-9a-fA-F]{24}$/)),
                collectionTypes: Joi.array()
                    .items(Joi.string()
                        .regex(/^[0-9a-fA-F]{24}$/)),
                paymentModes: {
                    debitCard: Joi.boolean(),
                    netBanking: Joi.boolean(),
                    paytm: Joi.boolean(),
                    cashOnDelivery: Joi.boolean(),
                },
                specialServiceUsers: Joi.array()
                    .items(Joi.number()),
            }),
        parameterSchema: Joi.object()
            .keys({
                name: Joi.string()
                    .required(),
                description: Joi.string(),
                baseCharge: Joi.number(),
                isActive: Joi.boolean(),
            }),
        parameterUpdateSchema: Joi.object()
            .keys({
                name: Joi.string(),
                description: Joi.string(),
                baseCharge: Joi.number(),
            }),
        collectionTypeSchema: Joi.object()
            .keys({
                name: Joi.string()
                    .required(),
                description: Joi.string(),
                baseCharge: Joi.number(),
                isActive: Joi.boolean(),
            }),
        collectionTypeUpdateSchema: Joi.object()
            .keys({
                name: Joi.string(),
                description: Joi.string(),
                baseCharge: Joi.number(),
            }),
        notificationSchema: Joi.object()
            .keys({
                message: Joi.string()
                    .required(),
                userId: Joi.number()
                    .required()
            }),
        notificationUpdateSchema: Joi.object()
            .keys({
                message: Joi.string(),
                userId: Joi.number()
            }),
        changeStatusSchema: Joi.object()
            .keys({
                isActive: Joi.boolean()
            }),
        changeOrderStatusSchema: Joi.object()
            .keys({
                status: Joi.number().required(),
                paymentType: Joi.number(),
                isPaymentDone: Joi.boolean(),
                paymentId: Joi.string(),
                trackingId: Joi.string(),
                speedPostName: Joi.string(),
            }),
        addOrderSchema: Joi.object()
            .keys({
                order: {
                    serviceId: Joi.string()
                        .regex(/^[0-9a-fA-F]{24}$/)
                        .required(),
                    unitsRequested: Joi.number(),
                    parameters: Joi.array().items(Joi.string()
                        .regex(/^[0-9a-fA-F]{24}$/)),
                    paymentType: Joi.number(),
                    isPaymentDone: Joi.boolean(),
                    paymentId: Joi.string(),
                    collectionType: Joi.string(),
                    comment: Joi.string(),
                },
                courier: {
                    name: Joi.string()
                        .required(),
                    contactNo: Joi.number()
                        .required(),
                    email: Joi.string()
                        .email()
                        .required(),
                    address: {
                        line1: Joi.string()
                            .required(),
                        line2: Joi.string()
                            .required(),
                        line3: Joi.string()
                            .required()
                    },
                    city: Joi.string()
                        .required(),
                    state: Joi.string()
                        .required(),
                    country: Joi.string(),
                    pinCode: Joi.number()
                        .required(),
                },
                pickup: {
                    name: Joi.string()
                        .required(),
                    contactNo: Joi.number()
                        .required(),
                    daiictId: Joi.string(),
                    email: Joi.string()
                        .email()
                        .required(),
                }
            }),
        updateOrderSchema: Joi.object()
            .keys({
                unitsRequested: Joi.number(),
                paymentType: Joi.number(),
                isPaymentDone: Joi.boolean(),
                paymentId: Joi.string(),
                comment: Joi.string(),
            }),
        updateOrderParameterSchema: Joi.object()
            .keys({
                parameters: Joi.array().items(Joi.string()
                    .regex(/^[0-9a-fA-F]{24}$/)),
            }),
        addOrderPickupSchema: Joi.object()
            .keys({
                name: Joi.string()
                    .required(),
                contactNo: Joi.number()
                    .required(),
                daiictId: Joi.string(),
                email: Joi.string()
                    .email()
                    .required(),
            }),
        updateOrderPickupSchema: Joi.object()
            .keys({
                name: Joi.string(),
                contactNo: Joi.number(),
                daiictId: Joi.string(),
                email: Joi.string()
                    .email(),
            }),
        addOrderCourierSchema: Joi.object()
            .keys({
                name: Joi.string()
                    .required(),
                contactNo: Joi.number()
                    .required(),
                email: Joi.string()
                    .email()
                    .required(),
                address: {
                    line1: Joi.string()
                        .required(),
                    line2: Joi.string()
                        .required(),
                    line3: Joi.string()
                        .required()
                },
                city: Joi.string()
                    .required(),
                state: Joi.string()
                    .required(),
                country: Joi.string(),
                pinCode: Joi.number()
                    .required(),
            }),
        updateOrderCourierSchema: Joi.object()
            .keys({
                name: Joi.string(),
                contactNo: Joi.number(),
                email: Joi.string()
                    .email(),
                address: {
                    line1: Joi.string(),
                    line2: Joi.string(),
                    line3: Joi.string()
                },
                city: Joi.string(),
                state: Joi.string(),
                country: Joi.string(),
                pinCode: Joi.number(),
            }),
        courierUpdateSchema: Joi.object()
            .keys({
                trackingId: Joi.string()
                    .required(),
                speedPostName: Joi.string()
                    .required(),
            }),
    },
};
