const nodeSchedule = require('node-cron');
const Invoice = require('nodeice');
const fs = require('fs');
const PdfMaker = require('html-pdf');

const { collectionTypes, PAYMENT_JOB_SCHEDULE_EXPRESSION } = require('../configuration/index');
const Cart = require('../models/cart');
const PlacedCart = require('../models/placedCart');
const UserInfo = require('../models/userInfo');

const indexFilePath = __dirname + '/templates/index.html';
const rowFilePath = __dirname + '/templates/row.html';
const invoiceHtmlDir = './data/invoice_html/';

const generateInvoice = async (cartId) => {

    const cart = await PlacedCart.findById(cartId)
        .populate('orders')
        .populate('pickup')
        .populate('delivery');

    const user = await UserInfo.findOne({ user_inst_id: cart.requestedBy });

    let myInvoice = new Invoice({
        config: {
            template: indexFilePath,
            tableRowBlock: rowFilePath
        },
        seller: {},
        buyer: {
            daiictId: '',
            firstName: '',
            lastName: ''
        },
        data: {
            currencyBalance: {
                main: 1,
                secondary: 1
            },
            invoice: {
                number: '',
                date: '',
                collectionType: '',
                collectionCost: 0,
                subTotal: 0,
                totalCost: 0,
                paymentType: '',
                paymentID: '',
                isPickup: false,
                info: {}
            },
            tasks: []
        }
    });

    // Setting buyer's fields
    myInvoice.options.buyer.daiictId = user.user_inst_id.toString();
    myInvoice.options.buyer.firstName = user.user_first_name;
    if (user.user_last_name) {
        myInvoice.options.buyer.lastName = user.user_last_name;
    }

    // Setting invoice fields
    myInvoice.options.data.invoice.number = cart.orderId;
    const currdate = new Date();
    myInvoice.options.data.invoice.date = currdate.getDate()
        .toString() + '/' + (currdate.getMonth() + 1)
        .toString() + '/' + currdate.getFullYear()
        .toString();
    myInvoice.options.data.invoice.collectionType = cart.collectionTypeCategory;
    myInvoice.options.data.invoice.collectionCost = cart.collectionTypeCost.toFixed(2);
    myInvoice.options.data.invoice.paymentType = cart.paymentType;
    myInvoice.options.data.invoice.subTotal = cart.ordersCost.toFixed(2);
    myInvoice.options.data.invoice.totalCost = cart.totalCost.toFixed(2);
    myInvoice.options.data.invoice.paymentID = cart.paymentId;

    if (myInvoice.options.data.invoice.collectionType === collectionTypes.delivery) {
        myInvoice.options.data.invoice.info = cart.delivery;
        myInvoice.options.data.invoice.isPickup = false;
    } else {
        myInvoice.options.data.invoice.info = cart.pickup;
        myInvoice.options.data.invoice.isPickup = true;
    }

    for (let i = 0; i < cart.orders.length; i++) {
        const subTask = {
            unitPrice: 0,
            servicename: '',
            comment: '',
            quantity: 0,
            serviceCost: 0,
            parameterCost: 0,
            subTotal: 0
        };

        subTask.servicename = cart.orders[i].service.name;
        if (cart.orders[i].comment) {
            subTask.comment = cart.orders[i].comment;
        }
        subTask.quantity = cart.orders[i].unitsRequested;
        subTask.serviceCost = cart.orders[i].serviceCost.toFixed(2);
        subTask.parameterCost = cart.orders[i].parameterCost.toFixed(2);
        subTask.subTotal = (cart.orders[i].serviceCost + cart.orders[i].parameterCost).toFixed(2);

        myInvoice.options.data.tasks.push(subTask);
    }

    const htmlFile = invoiceHtmlDir + cart.orderId.toString() + '_' + Date.now() + '.html';
    const pdfFile = (process.env.INVOICE_ROOT_PATH || './data/invoice_pdf') + '/' + cart.orderId.toString() + '.pdf';

    // Render invoice as HTML and PDF
    await myInvoice.toHtml(htmlFile, (err, data) => {
        if (err) {
            console.log(err);
        } else {
            console.log('Saved HTML file');
            const html = fs.readFileSync(htmlFile, 'utf8');
            const options = { format: 'A4' };

            PdfMaker.create(html, options)
                .toFile(pdfFile, (err, res) => {
                    if (err) {
                        return console.log(err);
                    }
                    console.log(res);
                });
        }
    });
};

const clearHtmlFiles = async () => {
    let files = fs.readdirSync(invoiceHtmlDir);
    let now = Date.now();
    files.forEach( (filename) => {
        let timeStampStr = filename.split('_')[1].split('.')[0];
        if (parseInt(timeStampStr) < now) {
            fs.unlink(invoiceHtmlDir+filename, (err) => {
                if (err) {
                    console.log(err);
                } else {
	                console.log("Deleted: " + filename);
	            }
            });
        }
    });
};

nodeSchedule.schedule(PAYMENT_JOB_SCHEDULE_EXPRESSION, async () => {
    await clearHtmlFiles();
});

module.exports = {
    generateInvoice,
    clearHtmlFiles,
};
