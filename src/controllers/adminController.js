
import Notification from '../models/notificationModel.js';
import { getIO } from '../config/socket.js';
import User from '../models/usermodel.js';
import Subscription from '../models/subscriptionModel.js';
import Category from '../models/categoryModel.js';
import Settings from '../models/settingsModel.js';

// Get all restaurants
export const getRestaurants = async (req, res) => {
    try {
        const restaurants = await User.find({ role: 'restaurant' });
        res.status(200).json(restaurants);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Single Restaurant Details
export const getRestaurantDetails = async (req, res) => {
    try {
        const restaurant = await User.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

        // Find latest subscription for this restaurant
        const subscription = await Subscription.findOne({ restaurant: req.params.id }).sort({ createdAt: -1 });

        res.status(200).json({
            restaurant,
            subscription
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Verify a restaurant
export const verifyRestaurant = async (req, res) => {
    try {
        const restaurant = await User.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

        restaurant.isVerified = true;
        // Set default plan (499) on initial admin verification if no plan exists
        if (!restaurant.subscriptionPlan || restaurant.subscriptionPlan === 'none') {
            restaurant.subscriptionPlan = '499';
            restaurant.subscriptionStatus = 'active';
            const expiry = new Date();
            expiry.setMonth(expiry.getMonth() + 1);
            restaurant.subscriptionExpiry = expiry;
        }
        await restaurant.save();

        res.status(200).json({ message: 'Restaurant Verified' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Add Restaurant Manually
export const addRestaurant = async (req, res) => {
    const { phone, restaurantName, address, name } = req.body;
    try {
        const existing = await User.findOne({ phone });
        if (existing) return res.status(400).json({ message: 'Restaurant with this phone already exists' });

        const restaurant = new User({
            phone,
            role: 'restaurant',
            restaurantName,
            address,
            name,
            isVerified: true // Auto-verify if added by admin
        });

        await restaurant.save();
        res.status(201).json({ message: 'Restaurant Added', restaurant });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Subscriptions (Deduplicated by Restaurant - showing latest request)
export const getSubscriptions = async (req, res) => {
    try {
        const { page = 1, limit = 10, restaurantId, status } = req.query;
        const skipCount = (parseInt(page) - 1) * parseInt(limit);

        const matchQuery = {};
        if (restaurantId) matchQuery.restaurant = new mongoose.Types.ObjectId(restaurantId);
        if (status && status !== 'all') matchQuery.status = status;

        // Use aggregation to group by restaurant and pick the latest subscription
        const aggregate = [
            { $match: matchQuery },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$restaurant",
                    latestSubscription: { $first: "$$ROOT" }
                }
            },
            { $replaceRoot: { newRoot: "$latestSubscription" } },
            { $sort: { createdAt: -1 } } // Sort unique entries by date
        ];

        // For total count of unique entries
        const countAggregate = [...aggregate];
        countAggregate.push({ $count: "total" });
        const countResult = await Subscription.aggregate(countAggregate);
        const total = countResult.length > 0 ? countResult[0].total : 0;

        // Paginate
        aggregate.push({ $skip: skipCount });
        aggregate.push({ $limit: parseInt(limit) });

        const subscriptions = await Subscription.aggregate(aggregate);

        // Populate restaurant info for the aggregation result
        const populatedSubscriptions = await Subscription.populate(subscriptions, {
            path: 'restaurant',
            select: 'restaurantName phone subscriptionStatus isSubscriptionBlocked'
        });

        res.status(200).json({
            subscriptions: populatedSubscriptions,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (error) {
        console.error('getSubscriptions Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Update Subscription Status (Approve/Reject)
export const updateSubscriptionStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const subscription = await Subscription.findById(req.params.id);
        if (!subscription) return res.status(404).json({ message: 'Subscription not found' });

        subscription.status = status;
        await subscription.save();

        const user = await User.findById(subscription.restaurant);
        if (user) {
            if (status === 'approved') {
                user.subscriptionStatus = 'active';
                user.subscriptionPlan = subscription.plan;
                user.isVerified = true;
                user.isSubscriptionBlocked = false; // Ensure unblocked on approval

                const expiry = new Date();
                expiry.setMonth(expiry.getMonth() + 1);
                user.subscriptionExpiry = expiry;
            } else if (status === 'rejected') {
                user.subscriptionStatus = 'none';
            }
            await user.save();
        }

        res.status(200).json({ message: `Subscription ${status}` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Toggle Subscription Block
export const toggleSubscriptionBlock = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user || user.role !== 'restaurant') {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        user.isSubscriptionBlocked = !user.isSubscriptionBlocked;
        if (user.isSubscriptionBlocked) {
            user.subscriptionStatus = 'blocked';
        } else {
            // Restore active status if expiry is still in future, else expired
            const now = new Date();
            if (user.subscriptionExpiry && user.subscriptionExpiry > now) {
                user.subscriptionStatus = 'active';
            } else {
                user.subscriptionStatus = 'expired';
            }
        }

        await user.save();
        res.status(200).json({
            message: `Subscription ${user.isSubscriptionBlocked ? 'Blocked' : 'Unblocked'}`,
            isSubscriptionBlocked: user.isSubscriptionBlocked,
            subscriptionStatus: user.subscriptionStatus
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Restaurant Subscription History
export const getRestaurantSubscriptionHistory = async (req, res) => {
    try {
        const subscriptions = await Subscription.find({ restaurant: req.params.id })
            .sort({ createdAt: -1 });
        res.status(200).json(subscriptions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create Category
export const createCategory = async (req, res) => {
    try {
        const { name, image } = req.body;
        const category = new Category({ name, image });
        await category.save();
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Categories
export const getCategories = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const categories = await Category.find({})
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await Category.countDocuments();

        res.status(200).json({
            categories,
            totalPages: Math.ceil(count / limit),
            currentPage: Number(page)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update Restaurant Priority
export const updateRestaurantPriority = async (req, res) => {
    try {
        const { id } = req.params;
        const { priority } = req.body;

        const restaurant = await User.findOneAndUpdate(
            { _id: id, role: 'restaurant' },
            { priority: parseInt(priority) || 0 },
            { new: true }
        );

        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

        res.status(200).json({ message: 'Priority updated', priority: restaurant.priority });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// Get All Users (Paginated with search and role filter)
export const getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', role = 'all' } = req.query;
        const skipCount = (parseInt(page) - 1) * parseInt(limit);

        const query = {
            _id: { $ne: req.user._id } // Exclude current admin
        };

        if (role !== 'all') {
            query.role = role;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { restaurantName: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .sort({ createdAt: -1 })
            .skip(skipCount)
            .limit(parseInt(limit));

        const total = await User.countDocuments(query);

        res.status(200).json({
            users,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get User Details
export const getUserDetails = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Toggle User Block Status
export const toggleUserStatus = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.role === 'admin' && user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'Cannot block yourself' });
        }

        user.isBlocked = !user.isBlocked;
        await user.save();

        res.status(200).json({
            message: `User ${user.isBlocked ? 'Blocked' : 'Unblocked'}`,
            isBlocked: user.isBlocked
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Send Notification (Manual Broadcast or Targeted)
export const sendNotification = async (req, res) => {
    try {
        const { title, message, targetRole = 'all', specificUserIds, type = 'general' } = req.body;
        const io = getIO();

        let recipients = [];
        if (specificUserIds && specificUserIds.length > 0) {
            recipients = await User.find({ _id: { $in: specificUserIds } });
        } else if (targetRole === 'all') {
            recipients = await User.find({ role: { $ne: 'admin' } });
        } else {
            recipients = await User.find({ role: targetRole });
        }

        if (recipients.length === 0) {
            return res.status(404).json({ message: 'No recipients found' });
        }

        const notifications = recipients.map(user => ({
            recipient: user._id,
            title,
            message,
            type: type
        }));

        await Notification.insertMany(notifications);

        // Emit via Socket
        recipients.forEach(user => {
            const room = user.role === 'restaurant' ? `restaurant:${user._id}` : `user:${user._id}`;
            io.to(room).emit('new_notification', {
                title,
                message,
                type: type,
                createdAt: new Date()
            });
        });

        res.status(200).json({ message: 'Notifications sent successfully', count: recipients.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Sent Notifications (Admin View)
export const getSentNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 25 } = req.query;
        const skipCount = (parseInt(page) - 1) * parseInt(limit);

        const notifications = await Notification.find()
            .populate('recipient', 'name phone email restaurantName role')
            .sort({ createdAt: -1 })
            .skip(skipCount)
            .limit(parseInt(limit));

        const total = await Notification.countDocuments();

        res.status(200).json({
            notifications,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Send Subscription Expiry Alerts to Restaurants
export const sendSubscriptionExpiryAlerts = async (req, res) => {
    try {
        const now = new Date();
        // Find restaurants with expired or near-expiry subscriptions (e.g., expiring in 3 days)
        const expiryThreshold = new Date();
        expiryThreshold.setDate(now.getDate() + 3);

        const expiredRestaurants = await User.find({
            role: 'restaurant',
            $or: [
                { subscriptionStatus: 'expired' },
                { subscriptionExpiry: { $lte: expiryThreshold, $gt: now } }
            ]
        });

        if (expiredRestaurants.length === 0) {
            return res.status(200).json({ message: 'No restaurants require alerts at this time' });
        }

        const io = getIO();
        const alerts = expiredRestaurants.map(restaurant => {
            const isExpired = restaurant.subscriptionExpiry <= now;
            const title = isExpired ? 'Subscription Expired' : 'Subscription Expiring Soon';
            const message = isExpired
                ? 'Your subscription has expired. Please renew to continue accepting orders.'
                : `Your subscription will expire on ${new Date(restaurant.subscriptionExpiry).toLocaleDateString()}. Renew now to avoid service interruption.`;

            return {
                recipient: restaurant._id,
                title,
                message,
                type: 'subscription'
            };
        });

        await Notification.insertMany(alerts);

        // Emit via Socket
        expiredRestaurants.forEach((restaurant, index) => {
            const alert = alerts[index];
            io.to(`restaurant:${restaurant._id}`).emit('new_notification', {
                ...alert,
                createdAt: new Date()
            });
        });

        res.status(200).json({ message: `${expiredRestaurants.length} expiry alerts sent`, count: expiredRestaurants.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Global Settings
export const getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }
        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update Global Settings
export const updateSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create(req.body);
        } else {
            settings = await Settings.findOneAndUpdate({}, req.body, { new: true });
        }
        res.status(200).json({ message: 'Settings updated successfully', settings });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
