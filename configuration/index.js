module.exports = {
    httpProtocol: 'http',
    daiictMailDomainName: 'daiict.ac.in',
    JWT_SECRET: 'ssrs-daiict-authentication',
    JWT_ISSUER: 'ssrs-daiict',
    JWT_EXPIRY_TIME: 1,
    NEWS_EXPIRY_TIME: 8,
    NOTIFICATION_EXPIRY_TIME: 8,
    collectionTypes : {
      courier:'Courier',
      pickup : 'Pickup',
    },
    permissions: {
        readAny: 'readAny',
        readOwn: 'readOwn',
        createAny: 'createAny',
        createOwn: 'createOwn',
        deleteAny: 'deleteAny',
        deleteOwn: 'deleteOwn',
        updateAny: 'updateAny',
        updateOwn: 'updateOwn',
    },
    userTypes: {
        student: 'student'
    },
    adminTypes: {
        superAdmin: 'superAdmin'
    },
    resources: {
        user: 'User',
        order: 'Order',
        service: 'Service',
        specialService: 'SpecialService',
        inActiveResource: 'InActiveResource',
        news: 'News',
        notification: 'Notification',
        courier: 'Courier',
        collector: 'Collector',
        accessLevel: 'AccessLevel',
        role: 'Role',
        parameter: 'Parameter',
        collectionType: 'CollectionType'
    },
    errors: {
        permissionDenied: 'Permission Denied',
        accountAlreadyExists: 'Account Already Exists',
        invalidToken: 'Invalid Token',
        sessionExpired: 'Session Expired',
    },
    cookiesName: {
        jwt: 'jwt',
    },
};


