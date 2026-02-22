import Product from '../models/productModel.js';
import Order from '../models/orderModel.js';
import Subscription from '../models/subscriptionModel.js';
import User from '../models/usermodel.js';
import Category from '../models/categoryModel.js';
import Notification from '../models/notificationModel.js';
import Settings from '../models/settingsModel.js';
import { getIO } from '../config/socket.js';

// Add Product
export const addProduct = async (req, res) => {
    try {
        const { name, image, price, category, description, isVeg } = req.body;

        let categoryId;

        // Check if category exists (Global or Restaurant-specific)
        const existingCategory = await Category.findOne({
            name: category,
            $or: [{ restaurant: null }, { restaurant: req.user.id }]
        });

        if (!existingCategory) {
            // Create new custom category for this restaurant
            const newCategory = new Category({
                name: category,
                restaurant: req.user.id,
                image: image // Set category image to product image
            });
            await newCategory.save();
            categoryId = newCategory._id;
        } else {
            categoryId = existingCategory._id;
        }

        const product = new Product({
            restaurant: req.user.id,
            name,
            image,
            price,
            category: categoryId,
            description,
            isVeg: isVeg !== undefined ? isVeg : true
        });
        await product.save();
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update Product
export const updateProduct = async (req, res) => {
    try {
        const { name, image, price, category, description, isAvailable, isVeg } = req.body;
        const product = await Product.findOne({ _id: req.params.id, restaurant: req.user.id });

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        product.name = name || product.name;
        product.image = image || product.image;
        product.price = price || product.price;
        product.description = description || product.description;
        if (isAvailable !== undefined) product.isAvailable = isAvailable;
        if (isVeg !== undefined) product.isVeg = isVeg;

        if (category) {
            // Check if category exists (Global or Restaurant-specific)
            let existingCategory = await Category.findOne({
                name: category,
                $or: [{ restaurant: null }, { restaurant: req.user.id }]
            });

            if (!existingCategory) {
                // Create new custom category if it doesn't exist (e.g. changing to a new custom name)
                const newCategory = new Category({
                    name: category,
                    restaurant: req.user.id,
                    image: product.image // Use product image
                });
                await newCategory.save();
                existingCategory = newCategory;
            }
            product.category = existingCategory._id;
        }

        await product.save();
        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get All Categories (Global + Restaurant Specific)
export const getRestaurantCategories = async (req, res) => {
    try {
        const categories = await Category.find({
            $or: [
                { restaurant: null },           // Global categories
                { restaurant: req.user.id }     // Restaurant-specific categories
            ]
        }).sort({ name: 1 });

        res.status(200).json({ categories });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete Product
export const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findOneAndDelete({ _id: req.params.id, restaurant: req.user.id });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json({ message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Restaurant Products
export const getMyProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip = (page - 1) * limit;

        const products = await Product.find({ restaurant: req.user.id })
            .populate('category', 'name')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 }); // Newest first

        const total = await Product.countDocuments({ restaurant: req.user.id });

        res.status(200).json({
            products,
            totalProducts: total,
            currentPage: page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Restaurant Orders with Pagination and Filtering
export const getMyOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, startDate, endDate } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        let query = { restaurant: req.user.id };

        // Date Filtering
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        const orders = await Order.find(query)
            .populate('user', 'name phone')
            .populate('items.product', 'name price image')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Order.countDocuments(query);

        res.status(200).json({
            orders,
            currentPage: Number(page),
            totalPages: Math.ceil(total / limit),
            totalOrders: total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Single Order Details for Restaurant
export const getOrderDetails = async (req, res) => {
    try {
        const order = await Order.findOne({ _id: req.params.id, restaurant: req.user.id })
            .populate('user', 'name phone')
            .populate('items.product', 'name price image');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update Order Status (Accept / Reject / Preparing / Ready / etc.)
export const updateOrderStatus = async (req, res) => {
    const { status } = req.body;
    // Map accept/reject to actual status values
    const statusMap = { accept: 'preparing', reject: 'cancelled' };
    const resolvedStatus = statusMap[status] || status;

    const validStatuses = ['pending', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(resolvedStatus)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    try {
        const order = await Order.findOne({ _id: req.params.id, restaurant: req.user.id });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        order.status = resolvedStatus;
        await order.save();

        // Create Persistent Notification for the user
        try {
            await Notification.create({
                recipient: order.user,
                title: `Order ${resolvedStatus.replace('_', ' ')}`,
                message: `Your order ${order.orderId} is now ${resolvedStatus.replace('_', ' ')}`,
                type: 'order_status',
                data: { orderId: order._id, orderRef: order.orderId }
            });
        } catch (_) { }

        // Emit real-time status to the user who placed the order
        try {
            const io = getIO();
            io.to(`user:${order.user.toString()}`).emit('order_status_update', {
                orderId: order._id.toString(),
                orderRef: order.orderId,
                status: resolvedStatus
            });
            // Also emit to restaurant for dashboard syncing
            io.to(`restaurant:${req.user.id}`).emit('restaurant_order_status_update', {
                orderId: order._id.toString(),
                status: resolvedStatus,
                totalAmount: order.totalAmount
            });
        } catch (_) { }

        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Submit Subscription Payment
export const submitSubscription = async (req, res) => {
    const { amount, screenshotUrl, plan } = req.body;
    try {
        const subscription = new Subscription({
            restaurant: req.user.id,
            amount,
            screenshotUrl,
            plan,
            status: 'pending'
        });
        await subscription.save();

        // Update user status to pending payment verification
        await User.findByIdAndUpdate(req.user.id, {
            subscriptionStatus: 'pending_payment',
            subscriptionPlan: plan
        });

        res.status(201).json({ message: 'Subscription submitted successfully. Waiting for admin approval.', subscription });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// Update Restaurant Profile
export const updateProfile = async (req, res) => {
    try {
        const { restaurantName, address, city, image, banner, userImage } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (restaurantName) user.restaurantName = restaurantName;
        if (address) user.address = address;
        if (city) user.city = city;
        if (image) user.image = image;
        if (banner) user.banner = banner;
        if (userImage) user.userImage = userImage;


        await user.save();

        // Return updated user data (excluding password)
        const updatedUser = await User.findById(req.user.id);
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Toggle Restaurant Open/Closed Status
export const toggleOpenStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isOpen = !user.isOpen;
        await user.save();

        res.status(200).json({ isOpen: user.isOpen });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// Create Category (Restaurant Specific)
export const createCategory = async (req, res) => {
    try {
        const { name, image } = req.body;

        // Check if category exists for this restaurant
        let category = await Category.findOne({
            name: name,
            restaurant: req.user.id
        });

        if (category) {
            return res.status(200).json(category); // Return existing
        }

        // Create new
        category = new Category({
            name,
            restaurant: req.user.id,
            image
        });

        await category.save();
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get My Notifications (Paginated & Unread Only)
export const getMyNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        // Fetch only unread notifications to support "clear on read"
        const notifications = await Notification.find({
            recipient: req.user.id,
            isRead: false
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Notification.countDocuments({
            recipient: req.user.id,
            isRead: false
        });

        res.status(200).json({
            notifications,
            currentPage: Number(page),
            totalPages: Math.ceil(total / limit),
            totalNotifications: total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Mark Notification as Read
export const markNotificationAsRead = async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
        res.status(200).json({ message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Mark All Notifications as Read
export const markAllNotificationsAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user.id, isRead: false },
            { isRead: true }
        );
        res.status(200).json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// Get Admin Payment Settings
export const getPaymentSettings = async (req, res) => {
    try {
        const settings = await Settings.findOne();
        if (!settings) {
            return res.status(200).json({
                adminUpiId: '8757641329@ybl',
                adminQrCodeUrl: ''
            });
        }
        res.status(200).json({
            adminUpiId: settings.adminUpiId,
            adminQrCodeUrl: settings.adminQrCodeUrl
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
