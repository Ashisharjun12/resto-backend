import Review from '../models/reviewModel.js';
import Order from '../models/orderModel.js';

export const createReview = async (req, res) => {
    try {
        const { restaurantId, orderId, rating, comment } = req.body;
        const userId = req.user._id;

        // 1. Check if order exists and belongs to the user
        const order = await Order.findOne({ _id: orderId, user: userId });
        if (!order) {
            return res.status(404).json({ message: 'Order not found or access denied.' });
        }

        // 2. Check if already reviewed (handled by unique index on orderId, but good to check)
        const existingReview = await Review.findOne({ orderId });
        if (existingReview) {
            return res.status(400).json({ message: 'You have already reviewed this order.' });
        }

        // 3. Create review
        const review = new Review({
            userId,
            restaurantId,
            orderId,
            rating,
            comment
        });

        await review.save();

        res.status(201).json({
            message: 'Review submitted successfully!',
            review
        });
    } catch (error) {
        console.error('Error creating review:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

export const getRestaurantReviews = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const reviews = await Review.find({ restaurantId })
            .populate('userId', 'name userImage') // Show reviewer info
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await Review.countDocuments({ restaurantId });

        res.json({
            reviews,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalReviews: count
        });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ message: 'Error fetching reviews.' });
    }
};

export const getReviewByOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const review = await Review.findOne({ orderId });
        res.json(review);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching review.' });
    }
};
