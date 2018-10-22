const HttpStatus = require('http-status-codes');

const Order = require('../models/order');
const Cart = require('../models/cart');

const { orderStatus, cartStatus } = require('../configuration');
const { parseFilterQuery } = require('../helpers/controllerHelpers');

module.exports = {
    getCartDetails: async (req, res, next) => {
        let { startDate, endDate } = req.query;
        let startDateArray = startDate.split("-");
        let endDateArray = endDate.split("-");

        startDate = new Date(Number(startDateArray[0]),Number(startDateArray[1])-1,Number(startDateArray[2])+1);
        endDate = new Date(Number(endDateArray[0]),Number(endDateArray[1])-1,Number(endDateArray[2])+1);

        const cartStats = await Cart.aggregate([
            {
                $match: {
                    status: {
                        $gt: cartStatus.placed,
                        $lte: cartStatus.onHold
                    },
                    'statusChangeTime.paymentComplete.time': {
                        $gte: startDate,
                        $lte: endDate
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    count: {
                        $sum: 1
                    },
                    total: {
                        $sum: '$totalCost'
                    }
                }
            }
        ]);

        const statistics = {};
        if (cartStats.length>0){
            statistics.count = cartStats[0].count;
            statistics.total = cartStats[0].total;
        }
        res.status(HttpStatus.OK).json(statistics);
    },
};
