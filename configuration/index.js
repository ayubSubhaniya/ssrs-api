module.exports = {
    homePage:'http://student-service-request-system.herokuapp.com/',
    sortQueryName: 'sort',
    httpProtocol: 'http',
    daiictMailDomainName: 'daiict.ac.in',
    JWT_SECRET: 'ssrs-daiict-authentication',
    JWT_ISSUER: 'ssrs-daiict',
    JWT_EXPIRY_TIME: 1,
    RESET_PASSWORD_EXPIRY_TIME: 1,
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
        courierInfo: 'CourierInfo'
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
        invalid: 10,
        unplaced: 20,
        placed: 30,
        paymentComplete: 40,
        processing: 50,
        readyToDeliver: 60,
        readyToPickup: 70,
        completed: 80,
        onHold: 90,
        cancelled: 100,
        refunded: 110,
    },
    orderStatus: {
        failed: 0,
        invalidOrder: 10,
        unplaced: 20,
        placed: 30,
        processing: 40,
        ready: 50,
        completed:60,
        onHold: 70,
        cancelled: 80,
        refunded: 90,
    },
    collectionStatus: {
        failed: 0,
        pendingPayment: 10,
        processing: 20,
        ready: 30,
        completed: 40
    },

    placedOrderServiceAttributes: [
        'name',
        'description',
        'baseCharge'
    ],

    placedOrderAttributes: [
        'orderId',
        'requestedBy',
        'service',
        'cartId',
        'createdOn',
        'serviceCost',
        'parameterCost',
        'comment',
        'totalCost',
        'status',
        'parameters',
        'unitsRequested',
        'cancelReason'
    ],

    placedCartAttributes: [
        'orderId',
        'cartId',
        'requestedBy',
        'orders',
        'createdOn',
        'collectionTypeCost',
        'ordersCost',
        'totalCost',
        'status',
        'paymentType',
        'paymentId',
        'paymentCode',
        'courier',
        'pickup',
        'collectionType',
        'cancelReason'
    ],

    allowedCartStatusChanges : {
        'placed': ['paymentComplete', 'processing', 'failed', 'cancelled'],
        'paymentComplete': ['processing', 'cancelled'],
        'processing': ['readyToDeliver', 'readyToPickup', 'cancelled'],
        'readyToDeliver': ['completed', 'cancelled'],
        'readyToPickup': ['completed', 'cancelled']
    },

    allowedOrderStatusChanges : {
        'placed': ['processing', 'failed', 'cancelled'],
        'processing': ['ready', 'cancelled'],
        'ready': ['completed', 'cancelled'],
    },
}
;


