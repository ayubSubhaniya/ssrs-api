/* 
    - All hard-coded strings should be declared here.
    - Strings should be STRICTLY wrapped by single quotes('')
*/

module.exports = {

    /* News */
    SERVICE_CREATED: 'New service {} has been created',
    SERVICE_UPDATED: 'Service {} has been updated',
    SERVICE_STATUS_CHANGE: 'Service {} is now {}',
    PARAMETER_STATUS_CHANGE: 'Parameter {} is now {}',
    COLLECTION_TYPE_STATUS_CHANGE: 'Collection-type {} is now {}',

    /* Notifications */
    ORDER_STATUS_UNPLACED: 'Your order {} is still unplaced',
    ORDER_STATUS_PLACED: 'Your order {} has been placed',
    ORDER_STATUS_PROCESSING: 'Your order {} is in process',
    ORDER_STATUS_READY: 'Your order {} is now ready',
    ORDER_STATUS_COMPLETED: 'Your order {} has been marked as completed',
    ORDER_STATUS_INVALID_ORDER: 'Your order {} has been deemed invalid',
    ORDER_STATUS_CANCELLED: 'Your order {} was cancelled',
    ORDER_STATUS_PAYMENT_FAILED: 'Your order {} has failed payment',
    ORDER_STATUS_ON_HOLD: 'Your order {} is put on hold',
    ORDER_STATUS_REFUNDED: 'Your order {} has been refunded',

    CART_STATUS_UNPLACED: 'Your cart with {} order(s) is still unplaced',
    CART_STATUS_PLACED: 'Your cart with {} order(s) has been placed',
    CART_STATUS_PROCESSING_ONLINE: 'Your cart with {} order(s) has completed payment and is being processed',
    CART_STATUS_PROCESSING_OFFLINE: 'Your cart with {} order(s) has completed payment and is being processed. Payment accepted by {}.',
    CART_STATUS_READY_TO_DELIVER: 'Your cart with {} order(s) is now ready to deliver',
    CART_STATUS_READY_TO_PICKUP: 'Your cart with {} order(s) is now ready for pickup',
    CART_STATUS_COMPLETED: 'Your cart with {} order(s) has been marked as completed',
    CART_STATUS_INVALID: 'Your cart with {} order(s) has been deemed invalid',
    CART_STATUS_CANCELLED: 'Your cart with {} order(s) was cancelled due to {}',
    CART_STATUS_PAYMENT_FAILED: 'Your cart with {} order(s) has failed the payment',
    CART_STATUS_ON_HOLD: 'Your cart with {} order(s) is put on hold',
    CART_STATUS_REFUNDED: 'Your cart with {} order(s) has been refunded',

    PENDING_PAYMENT_REMINDER: 'Your cart with {} order(s) has a pending {} payment. Pay fast or your order will get cancel.',

    INVALID_ORDER_DUE_TO_SERVICE: 'Some order(s) in your current cart has became invalid due to removal of some services. Please try adding them again.',
    INVALID_ORDER_DUE_TO_PARAMETER: 'Some order(s) in your current cart has became invalid due to changes in available parameters. Please try adding them again.',
    INVALID_ORDER_DUE_TO_COLLECTION_TYPE: 'Some order(s) in your current cart has became invalid due to changes in available collection-types. Please try adding them again.',
    INVALID_ORDER_DELETED: 'Some orders in your cart has became invalid. Kindly check "News" section for the same and try adding them again.',
    INVALID_CART_DELETED: 'Cart {} has been deleted due to unavailability of certain items. Kindly check "News" section for the same and try placing new order.',

    ADMIN_SERVICE_DELETED: 'Service {} has been deleted by {}',
    ADMIN_PARAMETER_DELETED: 'Parameter: {} has been deleted by {}',
    ADMIN_COLLECTION_TYPE_DELETED: 'CollectionType: {} has been deleted by {}',
}