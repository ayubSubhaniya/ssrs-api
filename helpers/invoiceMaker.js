const Invoice = require('nodeice');
const fs = require('fs');
const PdfMaker = require('html-pdf');

const { collectionTypes } = require('../configuration/index');
const Cart = require('../models/cart');
const UserInfo = require('../models/userInfo');

const indexFilePath = __dirname + "/templates/index.html";
const rowFilePath = __dirname + "/templates/row.html";
const invoiceHtmlDir = './data/invoice_html'
const invoicePdfDir = './data/invoice_pdf'

const generateInvoice = async (cartId) => {

    const cart = await Cart.findById(cartId)
                    .populate('orders');
    
    const user = await UserInfo.findOne({user_inst_id: cart.requestedBy});

    let myInvoice = new Invoice({
        config: {
            template: indexFilePath,
            tableRowBlock: rowFilePath
        },
        seller: {},
        buyer: {
            daiictId: "",
            firstName: "",
            lastName: ""
        },
        data: {
            currencyBalance: {
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
    myInvoice.options.buyer.daiictId = user.user_inst_id.toString();
    myInvoice.options.buyer.firstName = user.user_first_name;
    if (user.user_last_name)
        myInvoice.options.buyer.lastName = user.user_last_name;

    // Setting invoice fields
    myInvoice.options.data.invoice.number = cart.orderId;
    const currdate = new Date();
    myInvoice.options.data.invoice.date = currdate.getDate().toString() + '/' + currdate.getMonth().toString() + '/' + currdate.getFullYear().toString();
    myInvoice.options.data.invoice.collectionType = cart.collectionTypeCategory;
    myInvoice.options.data.invoice.collectionCost = cart.collectionTypeCost.toFixed(2);
    myInvoice.options.data.invoice.paymentType = cart.paymentType;
    myInvoice.options.data.invoice.subTotal = cart.ordersCost.toFixed(2);
    myInvoice.options.data.invoice.totalCost = cart.totalCost.toFixed(2);

    // if (myInvoice.options.data.invoice.collectionType === collectionTypes.delivery) {
    //     myInvoice.options.data.invoice.paymentID = cart.paymentId;
    //     myInvoice.options.data.invoice.info = cart.courier;
    // } else {
    //     myInvoice.options.data.invoice.paymentID = cart.paymentCode;
    //     myInvoice.options.data.invoice.info = cart.pickup;
    // }

    for (let i = 0; i < cart.orders.length; i++) {
        var subTask = {
            unitPrice: 0,
            servicename: "",
            comment: "",
            quantity: 0,
            serviceCost: 0,
            parameterCost: 0,
            subTotal: 0
        };

        subTask.servicename = cart.orders[i].serviceName;
        if (cart.orders[i].comment)
            subTask.comment = cart.orders[i].comment;
        subTask.quantity = cart.orders[i].unitsRequested;
        subTask.serviceCost = cart.orders[i].serviceCost.toFixed(2);
        subTask.parameterCost = cart.orders[i].parameterCost.toFixed(2);
        subTask.subTotal = (cart.orders[i].unitsRequested * (cart.orders[i].serviceCost + cart.orders[i].parameterCost)).toFixed(2);

        myInvoice.options.data.tasks.push(subTask);
    }

    const htmlFile = invoiceHtmlDir + '/' + cart.orderId.toString() + '.html';
    const pdfFile = invoicePdfDir + '/' + cart.orderId.toString() + '.pdf';

    // Render invoice as HTML and PDF
    myInvoice.toHtml(htmlFile, (err, data) => {
        if (err)
            console.log(err);
        else {
            console.log("Saved HTML file");
            const html = fs.readFileSync(htmlFile, 'utf8');
            const options = { format: 'A4' };

            PdfMaker.create(html, options).toFile(pdfFile, (err, res) => {
                if (err) 
                    return console.log(err);
                console.log(res);
            });
        }
    })
};

module.exports = {
    generateInvoice,
}