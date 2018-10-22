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
    myInvoice.data.invoice.number = cart.???;
    myInvoice.data.invoice.date = new Date();
    myInvoice.data.invoice.collectionType = cart.collectionType;
    myInvoice.data.invoice.collectionCost = cart.collectionTypeCost;
    myInvoice.data.invoice.paymentType = cart.paymentType;
    myInvoice.data.invoice.paymentID = cart.paymentId;
    myInvoice.data.invoice.subTotal = cart.ordersCost;
    myInvoice.data.invoice.totalCost = cart.totalCost;


    var subTask = {
        unitPrice: 0,
        servicename: "",
        quantity: 0,
        serviceCost: 0,
        parameterCost: 0,
        subTotal: 0
    };
};

module.exports = {
    generateInvoice,
}