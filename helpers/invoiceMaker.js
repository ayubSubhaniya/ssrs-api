const Invoice = require('nodeice');

const generateInvoice = (cart, user) => {

    let myInvoice = new Invoice({
        config: {
            template: __dirname + "/templates/index.html",
            tableRowBlock: __dirname + "/templates/row.html"
        },
        seller: {},
        buyer: {
            daiictId: 0,
            firstName: "-",
            lastName: ""
        },
        data: {
            currencyBalance : {
                main: 1,
                secondary: 1
            },
            invoice: {
                number: "",
                date: "",
                collectionType: "",
                collectionCost: 0,
                subTotal: 0,
                totalCost: 0,
                paymentType: "",
                paymentID: "",
                info: {}
            },
            tasks: []
        }
    });

    // Setting buyer's fields
    myInvoice.buyer.daiictId = user.daiictId;
    myInvoice.buyer.firstName = user.name.firstName;
    myInvoice.buyer.lastName = user.name.lastName;

    // Setting invoice fields
    myInvoice.data.invoice.number = cart.orderId;
    myInvoice.data.invoice.date = new Date();
    myInvoice.data.invoice.collectionType = cart.collectionType;
    myInvoice.data.invoice.collectionCost = cart.collectionTypeCost.toFixed(2);
    myInvoice.data.invoice.paymentType = cart.paymentType;
    myInvoice.data.invoice.subTotal = cart.ordersCost.toFixed(2);
    myInvoice.data.invoice.totalCost = cart.totalCost.toFixed(2);

    if(myInvoice.data.invoice.collectionType === 'courier'){
        myInvoice.data.invoice.paymentID = cart.paymentId;
        myInvoice.data.invoice.info = cart.courier;
    } else {
        myInvoice.data.invoice.paymentID = cart.paymentCode;
        myInvoice.data.invoice.info = cart.pickup;
    }

    for(let i=0; i<cart.orders.length; i++){
        var subTask = {
            unitPrice: 0,
            servicename: "",
            quantity: 0,
            serviceCost: 0,
            parameterCost: 0,
            subTotal: 0
        };

        subTask.servicename = cart.orders[i].serviceName;
        subTask.quantity = cart.orders[i].unitsRequested;
        subTask.serviceCost = cart.orders[i].serviceCost.toFixed(2);
        subTask.parameterCost = cart.orders[i].parameterCost.toFixed(2);
        subTask.subTotal = subTask.quantity * (subTask.serviceCost + subTask.parameterCost);

        myInvoice.data.tasks.push(subTask);
    }

    return myInvoice;
};

module.exports = {
    generateInvoice,
}