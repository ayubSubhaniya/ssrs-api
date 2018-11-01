module.exports = {
    userBlockageTimeForTooManySignUpRequests: 1, // unit hour
    maximumSignUpRequestBeforeBlocking: 5,
    easyPaySuccessResponse: 'E000',
    systemAdmin: 'system',
    homePage: 'https://ssrs.daiict.ac.in:8443/',
    sortQueryName: 'sort',
    httpProtocol: 'http',
    daiictMailDomainName: 'daiict.ac.in',
    orderNoGeneratorSecret: 'ssrs-orders',
    JWT_SECRET: 'ssrs-daiict-authentication',
    JWT_ISSUER: 'ssrs-daiict',
    JWT_EXPIRY_TIME: 1, //unit day
    RESET_PASSWORD_EXPIRY_TIME: 1, //unit day
    NEWS_EXPIRY_TIME: 8, //unit day
    NOTIFICATION_EXPIRY_TIME: 8, //unit day
    ORDER_CANCEL_TIME_IN_PAYMENT_DELAY: 8, //unit day
    CHECK_FOR_OFFLINE_PAYMENT: 1, //unit day
    collectionTypes: {
        delivery: 'Delivery',
        pickup: 'Pickup',
    },
    paymentTypes: {
        offline: 'offline',
        online: 'online'
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
        superAdmin: 'superAdmin',
        admin: 'admin'
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
        delivery: 'Courier',
        collector: 'Collector',
        accessLevel: 'AccessLevel',
        role: 'Role',
        parameter: 'Parameter',
        collectionType: 'CollectionType',
        cart: 'Cart',
        courierInfo: 'CourierInfo',
        userInfo: 'UserInfo'
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
        invalid: 10,
        unplaced: 20,
        paymentFailed: 23,
        processingPayment: 25,
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
        paymentFailed: 0,
        invalidOrder: 10,
        unplaced: 20,
        placed: 30,
        processing: 40,
        ready: 50,
        completed: 60,
        onHold: 70,
        cancelled: 80,
        refunded: 90,
    },
    collectionStatus: {
        paymentFailed: 0,
        pendingPayment: 10,
        processing: 20,
        ready: 30,
        completed: 40,
        cancel: 50
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
        'delivery',
        'pickup',
        'collectionType',
        'cancelReason'
    ],

    allowedCartStatusChanges: {
        'placed': ['paymentComplete', 'processing', 'paymentFailed', 'cancelled'],
        'paymentComplete': ['processing', 'cancelled'],
        'processing': ['readyToDeliver', 'readyToPickup', 'cancelled'],
        'readyToDeliver': ['completed', 'cancelled'],
        'readyToPickup': ['completed', 'cancelled']
    },

    allowedOrderStatusChanges: {
        'placed': ['processing', 'paymentFailed', 'cancelled'],
        'processing': ['ready', 'cancelled'],
        'ready': ['completed', 'cancelled'],
    },

    defaultPermissionObject: {
        User: {
            read: 'none',
            update: 'none',
            create: 'none',
            delete: 'none',
        },
        Order: {
            read: 'none',
            update: 'none',
            create: 'none',
            delete: 'none',
        },
        Service: {
            read: 'none',
            update: 'none',
            create: 'none',
            delete: 'none',
        },
        SpecialService: {
            read: 'none',
            update: 'none',
            create: 'none',
            delete: 'none',
        },
        InActiveResource: {
            read: 'none',
            update: 'none',
            create: 'none',
            delete: 'none',
        },
        changeResourceStatus: {
            read: 'none',
            update: 'none',
            create: 'none',
            delete: 'none',
        },
        News: {
            read: 'none',
            update: 'none',
            create: 'none',
            delete: 'none',
        },
        Notification: {
            read: 'none',
            update: 'none',
            create: 'none',
            delete: 'none',
        },
        Courier: {
            read: 'none',
            update: 'none',
            create: 'none',
            delete: 'none',
        },
        Collector: {
            read: 'none',
            update: 'none',
            create: 'none',
            delete: 'none',
        },
        AccessLevel: {
            read: 'none',
            update: 'none',
            create: 'none',
            delete: 'none',
        },
        Role: {
            read: 'none',
            update: 'none',
            create: 'none',
            delete: 'none',
        },
        Parameter: {
            read: 'none',
            update: 'none',
            create: 'none',
            delete: 'none',
        },
        CollectionType: {
            read: 'none',
            update: 'none',
            create: 'none',
            delete: 'none',
        },
        Cart: {
            read: 'none',
            update: 'none',
            create: 'none',
            delete: 'none',
        },
        CourierInfo: {
            read: 'none',
            update: 'none',
            create: 'none',
            delete: 'none',
        },
        UserInfo: {
            read: 'none',
            update: 'none',
            create: 'none',
            delete: 'none',
        }
    }
}
;


