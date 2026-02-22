
import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';
import mongoose from 'mongoose';

// Get Revenue Analytics & Stats
export const getRevenueStats = async (req, res) => {
    try {
        const { startDate, endDate, search, page = 1, limit = 15 } = req.query;
        const restaurantId = new mongoose.Types.ObjectId(req.user.id);
        let query = { restaurant: restaurantId };

        // Base date query for stats
        let dateQuery = { restaurant: restaurantId };
        if (startDate && endDate) {
            dateQuery.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
            // Also apply to main query
            query.createdAt = dateQuery.createdAt;
        }

        // Apply search only to the orders list query
        if (search) {
            query.orderId = { $regex: search, $options: 'i' };
            // If searching globally, we can optionaly remove date from query 
            // but the user said "stats on that date range actual that show"
            // so we keep the date filter in query too if it exists.
        }

        // 1. Overall Stats - ALWAYS based on date range (actual show)
        const netRevenueMatch = { ...dateQuery, status: { $ne: 'cancelled' } };
        const grossRevenueMatch = { ...dateQuery }; // All orders in range

        const overallStats = await Order.aggregate([
            {
                $facet: {
                    net: [
                        { $match: netRevenueMatch },
                        {
                            $group: {
                                _id: null,
                                revenue: { $sum: '$totalAmount' },
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    gross: [
                        { $match: grossRevenueMatch },
                        {
                            $group: {
                                _id: null,
                                revenue: { $sum: '$totalAmount' },
                                count: { $sum: 1 }
                            }
                        }
                    ]
                }
            }
        ]);

        const netRevenue = overallStats[0]?.net[0]?.revenue || 0;
        const successfulOrders = overallStats[0]?.net[0]?.count || 0;
        const totalOrdersCount = overallStats[0]?.gross[0]?.count || 0;
        const avgTicket = successfulOrders > 0 ? netRevenue / successfulOrders : 0;

        // 2. Revenue Trend (Daily Breakdown for chart & table)
        const trend = await Order.aggregate([
            { $match: netRevenueMatch },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    revenue: { $sum: "$totalAmount" },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // 3. Most Ordered Items
        const mostOrdered = await Order.aggregate([
            { $match: netRevenueMatch }, // Also exclude cancelled from "Most Ordered"
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.product",
                    count: { $sum: "$items.quantity" },
                    revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: { path: "$productDetails", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    name: "$productDetails.name",
                    image: "$productDetails.image",
                    count: 1,
                    revenue: 1
                }
            }
        ]);

        // 4. Detailed Orders List with Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const orders = await Order.find(query)
            .populate('user', 'name phone')
            .populate('items.product', 'name image')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalFilteredOrders = await Order.countDocuments(query);

        res.status(200).json({
            netRevenue,
            totalOrders: successfulOrders,
            grossOrders: totalOrdersCount,
            avgTicket,
            trend,
            mostOrdered,
            orders,
            pagination: {
                total: totalFilteredOrders,
                page: parseInt(page),
                pages: Math.ceil(totalFilteredOrders / (parseInt(limit) || 15))
            },
            period: { startDate, endDate }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
