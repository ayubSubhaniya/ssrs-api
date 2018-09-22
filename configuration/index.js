module.exports = {
    sortQueryName: 'sort',
    httpProtocol: 'http',
    daiictMailDomainName: 'daiict.ac.in',
    JWT_SECRET: 'ssrs-daiict-authentication',
    JWT_ISSUER: 'ssrs-daiict',
    JWT_EXPIRY_TIME: 1,
    NEWS_EXPIRY_TIME: 8,
    NOTIFICATION_EXPIRY_TIME: 8,
    collectionTypes: {
        courier: 'Courier',
        pickup: 'Pickup',
    },
    paymentTypes: {
        offline: 0,
        payTm: 1,
        creditCard: 2,
        debitCard: 3
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
        changeResourceStatus: 'changeResourceStatus',
        news: 'News',
        notification: 'Notification',
        courier: 'Courier',
        collector: 'Collector',
        accessLevel: 'AccessLevel',
        role: 'Role',
        parameter: 'Parameter',
        collectionType: 'CollectionType',
        cart: 'Cart',
    },
    validityErrors: {
        permissionDenied: 'Permission Denied',
        accountAlreadyExists: 'Account Already Exists',
        invalidToken: 'Invalid Token',
        sessionExpired: 'Session Expired',
    },
    cookiesName: {
        jwt: 'jwt',
    },
    cartStatus: {
        failed: 0,
        invalidOrders: 10,
        unplaced: 20,
        placed: 30,
        paymentComplete: 40,
        processing: 50,
        delivered: 60,
        readyToPickup: 70,
        onHold: 80,
        cancelled: 90,
        refunded: 100,
    },
    orderStatus: {
        failed: 0,
        invalidOrder: 10,
        paymentIncomplete: 20,
        placed: 30,
        processingOrder: 40,
        readyToDeliver: 50,
        delivered: 60,
        readyToPickup: 70,
        onHold: 80,
        cancelled: 90,
        refunded: 100,
    },
}
;


