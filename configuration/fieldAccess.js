module.exports = {
    User: {
        superAdmin: {
            canUpdate: [
                'name',
                'secondaryEmail',
                'contactNo',
                'gender',
                'programme',
                'requestedServices',
                'password',
            ],
            canRead: [
                'name',
                'secondaryEmail',
                'contactNo',
                'gender',
                'programme',
                'userType',
                'isActive',
                'requestedServices',
                'notifications',
                'daiictId',
                'primaryEmail',
                'createdOn',
            ],
            canCreate: [
                'name',
                'secondaryEmail',
                'contactNo',
                'gender',
                'programme',
                'requestedServices',
                'daiictId',
                'primaryEmail',
                'password',
            ],
        },
        student: {
            canUpdate: [
                'name',
                'secondaryEmail',
                'contactNo',
                'gender',
                'programme',
                'requestedServices',
            ],
            canRead: [
                'name',
                'secondaryEmail',
                'contactNo',
                'gender',
                'programme',
                'userType',
                'isActive',
                'requestedServices',
                'notifications',
                'daiictId',
                'primaryEmail',
                'createdOn',
            ],
            canCreate: [
                'name',
                'secondaryEmail',
                'contactNo',
                'gender',
                'programme',
                'requestedServices',
                'daiictId',
                'primaryEmail',
                'password',
            ],
        },
    },
    News: {
        superAdmin: {
            canRead: [
                '_id',
                'message',
                'createdOn',
            ],
            canCreate: [
                'message',
            ],
            canUpdate: [
                'message',
            ],
        },
        student: {
            canRead: [
                'message',
                'createdOn',
            ],
            canCreate: [],
            canUpdate: [],
        },
    },
    Notification: {
        superAdmin: {
            canRead: [
                '_id',
                'message',
                'createdOn',
            ],
            canCreate: [
                'message',
            ],
            canUpdate: [
                'message',
            ],
        },
        student: {
            canRead: [
                'message',
                'createdOn',
            ],
            canCreate: [],
            canUpdate: [],
        },
    },
    Order: {
        superAdmin: {
            canRead: [
                '_id',
                'requestedBy',
                'serviceId',
                'serviceName',
                'createdOn',
                'lastModified',
                'lastModifiedBy',
                'serviceCost',
                'parameterCost',
                'comment',
                'collectionTypeCost',
                'totalCost',
                'status',
                'parameters',
                'paymentType',
                'isPaymentDone',
                'paymentId',
                'courier',
                'pickup',
                'collectionType',
                'validityErrors',
                'unitsRequested',
            ],
            canCreate: [],
            canUpdate: [
                'status'
            ],
        },
        student: {
            canRead: [
                '_id',
                'requestedBy',
                'serviceId',
                'serviceName',
                'createdOn',
                'lastModified',
                'serviceCost',
                'parameterCost',
                'collectionTypeCost',
                'totalCost',
                'status',
                'comment',
                'parameters',
                'paymentType',
                'isPaymentDone',
                'paymentId',
                'courier',
                'pickup',
                'collectionType',
                'validityErrors',
                'unitsRequested',
            ],
            canCreate: [
                'serviceId',
                'parameters',
                'paymentType',
                'isPaymentDone',
                'paymentId',
                'comment',
                'collectionType',
                'unitsRequested',
            ],
            canUpdate: [
                'paymentType',
                'isPaymentDone',
                'paymentId',
                'comment',
                'courier',
                'pickup',
                'unitsRequested',
            ]
        },
    },
    Service: {
        superAdmin: {
            canRead: [
                '_id',
                'name',
                'description',
                'createdOn',
                'createdBy',
                'isApplicationSpecific',
                'isAvailableForAlumni',
                'isCourierAvailable',
                'isSpecialService',
                'isActive',
                'maxUnits',
                'baseCharge',
                'availableParameters',
                'specialServiceUsers',
                'paymentModes',
                'collectionTypes',
            ],
            canCreate: [
                'name',
                'description',
                'isApplicationSpecific',
                'isAvailableForAlumni',
                'isCourierAvailable',
                'isSpecialService',
                'isActive',
                'maxUnits',
                'baseCharge',
                'availableParameters',
                'specialServiceUsers',
                'paymentModes',
                'collectionTypes',
            ],
            canUpdate: [
                'name',
                'description',
                'isApplicationSpecific',
                'isAvailableForAlumni',
                'isCourierAvailable',
                'isSpecialService',
                'isActive',
                'maxUnits',
                'baseCharge',
                'availableParameters',
                'specialServiceUsers',
                'paymentModes',
                'collectionTypes',
            ],
        },
        student: {
            canRead: [
                '_id',
                'name',
                'description',
                'maxUnits',
                'baseCharge',
                'availableParameters',
                'paymentModes',
                'collectionTypes',
            ],
            canCreate: [],
            canUpdate: []
        },
    },
    SpecialService: {
        superAdmin: {
            canRead: [
                '*'
            ],
            canCreate: [],
            canUpdate: [],
        },
        student: {
            canRead: [],
            canCreate: [],
            canUpdate: []
        },
    },
    InActiveResource: {
        superAdmin: {
            canRead: [
                '*'
            ],
            canCreate: [],
            canUpdate: [],
        },
        student: {
            canRead: [],
            canCreate: [],
            canUpdate: []
        },
    },
    changeResourceStatus: {
        superAdmin: {
            canRead: [],
            canCreate: [],
            canUpdate: [
                '*'
            ],
        },
        student: {
            canRead: [],
            canCreate: [],
            canUpdate: []
        },
    },
    Collector: {
        superAdmin: {
            canRead: [
                '_id',
                'name',
                'daiictId',
                'contactNo',
                'email',
                'collectionCode',
                'createdOn',
                'createdBy',
                'orderId',
            ],
            canCreate: [],
            canUpdate: [],
        },
        student: {
            canRead: [
                '_id',
                'name',
                'daiictId',
                'contactNo',
                'email',
                'collectionCode',
                'orderId',
            ],
            canCreate: [
                'name',
                'daiictId',
                'contactNo',
                'email',
            ],
            canUpdate: [
                'name',
                'daiictId',
                'contactNo',
                'email',
            ]
        },
    },
    Courier: {
        superAdmin: {
            canRead: [
                '_id',
                'name',
                'contactNo',
                'email',
                'address',
                'city',
                'state',
                'country',
                'createdOn',
                'createdBy',
                'pinCode',
                'trackingId',
                'speedPostName',
                'orderId',
            ],
            canCreate: [],
            canUpdate: [],
        },
        student: {
            canRead: [
                '_id',
                'name',
                'contactNo',
                'email',
                'address',
                'city',
                'state',
                'country',
                'pinCode',
                'trackingId',
                'speedPostName',
                'orderId',
            ],
            canCreate: [
                'name',
                'contactNo',
                'email',
                'address',
                'city',
                'state',
                'country',
                'pinCode',
            ],
            canUpdate: [
                'name',
                'contactNo',
                'email',
                'address',
                'city',
                'state',
                'country',
                'pinCode',
            ]
        },
    },
    Parameter: {
        superAdmin: {
            canRead: [
                '_id',
                'name',
                'description',
                'baseCharge',
                'createdOn',
                'createdBy',
                'isActive'
            ],
            canCreate: [
                '_id',
                'name',
                'description',
                'baseCharge',
            ],
            canUpdate: [
                'name',
                'description',
                'baseCharge',
                'isActive'
            ],
        },
        student: {
            canRead: [
                '_id',
                'name',
                'description',
                'baseCharge',
            ],
            canCreate: [],
            canUpdate: []
        },
    },
    CollectionType: {
        superAdmin: {
            canRead: [
                '_id',
                'name',
                'description',
                'baseCharge',
                'createdOn',
                'createdBy',
                'isActive'
            ],
            canCreate: [
                '_id',
                'name',
                'description',
                'baseCharge',
            ],
            canUpdate: [
                'name',
                'description',
                'baseCharge',
                'isActive'
            ],
        },
        student: {
            canRead: [
                '_id',
                'name',
                'description',
                'baseCharge',
            ],
            canCreate: [],
            canUpdate: []
        },
    },
    AccessLevel: {
        superAdmin: {
            canRead: [],
            canCreate: [],
            canUpdate: [],
        },
        student: {
            canRead: [],
            canCreate: [],
            canUpdate: []
        },
    },
    Role: {
        superAdmin: {
            canRead: [],
            canCreate: [],
            canUpdate: [],
        },
        student: {
            canRead: [],
            canCreate: [],
            canUpdate: []
        },
    },
};
