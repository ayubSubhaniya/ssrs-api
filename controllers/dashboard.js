const HttpStatus = require('http-status-codes');

const Order = require('../models/order');
const Service = require('../models/service');
const Cart = require('../models/cart');
const CollectionType = require('../models/collectionType');

const { orderStatus, cartStatus, userTypes, adminTypes } = require('../configuration');
const { parseFilterQuery } = require('../helpers/controllerHelpers');

module.exports = {
    getDetails: async (req, res, next) => {
        const {user} = req;

        if (user.userType === adminTypes.superAdmin){
            let { startDate, endDate } = req.query;

            if (!startDate) {
                startDate = new Date(0);
            } else {
                let startDateArray = startDate.split('-');
                startDate = new Date(Number(startDateArray[0]), Number(startDateArray[1]) - 1, Number(startDateArray[2]) + 1);
            }

            if (!endDate) {
                endDate = new Date();
            } else {
                let endDateArray = endDate.split('-');
                endDate = new Date(Number(endDateArray[0]), Number(endDateArray[1]) - 1, Number(endDateArray[2]) + 1);
            }

            const totalStats = await Cart.aggregate([
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
                        revenue: {
                            $sum: '$totalCost'
                        }
                    }
                }
            ]);

            const collectionTypeStats = await Cart.aggregate([
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
                        _id: '$collectionType',
                        count: {
                            $sum: 1
                        },
                        revenue: {
                            $sum: '$collectionTypeCost'
                        }
                    }
                },
                {
                    $project: {
                        _id:0,
                        collectionType:'$_id',
                        count:1,
                        revenue:1
                    }
                }
            ]);

            const populatedCollectionTypeStats = await CollectionType.populate(collectionTypeStats, {
                path: 'collectionType',
                select: ['name']
            });

            const paymentStats = await Cart.aggregate([
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
                        _id: '$paymentType',
                        count: {
                            $sum: 1
                        },
                        revenue: {
                            $sum: '$totalCost'
                        }
                    }
                },
                {
                    $project: {
                        _id:0,
                        paymentType:'$_id',
                        count:1,
                        revenue:1
                    }
                }
            ]);

            const orderStats = await Order.aggregate([
                {
                    $match: {
                        status: {
                            $gt: orderStatus.placed,
                            $lte: orderStatus.onHold
                        },
                        'statusChangeTime.processing.time': {
                            $gte: startDate,
                            $lte: endDate
                        }
                    }
                },
                {
                    $group: {
                        _id: "$service",
                        count: {
                            $sum: 1
                        },
                        revenue: {
                            $sum: '$totalCost'
                        }
                    }
                },
                {
                    $project: {
                        _id:0,
                        service:'$_id',
                        count:1,
                        revenue:1
                    }
                }
            ]);

            const populatedOrderStats = await Service.populate(orderStats, {
                path: 'service',
                select: ['name']
            });


            const statistics = {};

            if (totalStats.length > 0) {
                statistics.order = {};
                statistics.order.count = totalStats[0].count;
                statistics.order.revenue = totalStats[0].revenue;
            }

            statistics.collectionType = populatedCollectionTypeStats;

            statistics.paymentType = paymentStats;

            statistics.service = populatedOrderStats;


            res.status(HttpStatus.OK)
                .json(statistics);
        } else {
            res.sendStatus(HttpStatus.FORBIDDEN);
        }
    },
};
