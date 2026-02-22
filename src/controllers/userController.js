import { getDistance } from 'geolib';
import User from '../models/usermodel.js';
import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';
import Address from '../models/addressModel.js';
import Notification from '../models/notificationModel.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import { getIO } from '../config/socket.js';

const generateToken = (id) => {
    return jwt.sign({ id }, config.jwtSecret, { expiresIn: '30d' });
};

// Get All Restaurants (for users to browse)
export const getAllRestaurants = async (req, res) => {
    try {
        const { city, lat, lng, search, page = 1, limit = 10 } = req.query;
        let query = { role: 'restaurant', isVerified: true };

        if (city) {
            query.city = city;
        }

        if (search) {
            const productMatches = await Product.find({
                name: { $regex: search, $options: 'i' },
                isAvailable: true
            }).distinct('restaurant');

            query.$or = [
                { restaurantName: { $regex: search, $options: 'i' } },
                { _id: { $in: productMatches } }
            ];
        }

        let restaurants = await User.find(query)
            .select('restaurantName address phone subscriptionStatus location deliveryRadius image banner rating city isOpen priority');

        // Filter by Radius if lat/lng provided
        if (lat && lng) {
            const userLocation = { latitude: Number(lat), longitude: Number(lng) };

            restaurants = restaurants.filter(restaurant => {
                if (!restaurant.location || !restaurant.location.lat || !restaurant.location.lng) {
                    return false;
                }

                const restaurantLocation = {
                    latitude: restaurant.location.lat,
                    longitude: restaurant.location.lng
                };

                const distance = getDistance(userLocation, restaurantLocation);
                restaurant.distance = distance; // Store for sorting
                const radius = restaurant.deliveryRadius || 5000;

                return distance <= radius;
            });
        }

        // Sort by Priority (Higher first) then Distance (Closer first)
        restaurants.sort((a, b) => {
            const priorityDiff = (b.priority || 0) - (a.priority || 0);
            if (priorityDiff !== 0) return priorityDiff;

            // If both have same priority, sort by distance if available
            if (a.distance !== undefined && b.distance !== undefined) {
                return a.distance - b.distance;
            }
            return 0;
        });

        // Pagination (in-memory since we filtered by location)
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedRestaurants = restaurants.slice(startIndex, endIndex);

        res.status(200).json({
            restaurants: paginatedRestaurants,
            currentPage: Number(page),
            totalPages: Math.ceil(restaurants.length / limit),
            totalRestaurants: restaurants.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Restaurant Details by ID
export const getRestaurantById = async (req, res) => {
    try {
        const restaurant = await User.findById(req.params.id).select('restaurantName address phone subscriptionStatus location deliveryRadius image banner rating city role isOpen');
        if (!restaurant || restaurant.role !== 'restaurant') {
            return res.status(404).json({ message: 'Restaurant not found' });
        }
        res.status(200).json(restaurant);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Restaurant Categories
export const getRestaurantCategories = async (req, res) => {
    try {
        const categories = await Product.find({ restaurant: req.params.restaurantId, isAvailable: true })
            .distinct('category');

        // Since distinct returns IDs, we need to populate them manually or use aggregation
        // A better approach for now to get full category details:
        const products = await Product.find({ restaurant: req.params.restaurantId, isAvailable: true })
            .populate('category', 'name image');

        const uniqueCategories = new Map();
        products.forEach(p => {
            if (p.category && p.category._id) {
                uniqueCategories.set(p.category._id.toString(), p.category);
            }
        });

        res.status(200).json(Array.from(uniqueCategories.values()));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Menu (Products of a specific restaurant) with Pagination & Filtering
export const getRestaurantMenu = async (req, res) => {
    try {
        const { page = 1, limit = 12, category, isVeg } = req.query;
        const query = { restaurant: req.params.restaurantId, isAvailable: true };

        if (category) {
            query.category = category;
        }

        if (isVeg === 'true') {
            query.isVeg = true;
        }

        const products = await Product.find(query)
            .populate('category', 'name image')
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Product.countDocuments(query);

        res.status(200).json({
            products,
            currentPage: Number(page),
            totalPages: Math.ceil(total / limit),
            totalProducts: total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Place Order
export const createOrder = async (req, res) => {
    const { restaurantId, items, totalAmount, paymentMethod, paymentScreenshot, deliveryAddress } = req.body;
    try {
        // Fetch restaurant to check if it's open
        const restaurant = await User.findById(restaurantId);
        if (!restaurant || (restaurant.isOpen === false)) {
            return res.status(400).json({ message: 'Restaurant is currently closed and not accepting orders.' });
        }

        // Fetch user to get address if not provided in body
        const user = await User.findById(req.user.id);

        const addressSnapshot = deliveryAddress || {
            address: user.address,
            city: user.city,
            location: user.location
        };

        const order = new Order({
            user: req.user.id,
            restaurant: restaurantId,
            items, // Expects [{ product, quantity, price }]
            totalAmount,
            paymentMethod,
            paymentScreenshot,
            deliveryAddress: addressSnapshot,
            status: 'pending'
        });

        await order.save();

        // Create Persistent Notification for the restaurant
        try {
            await Notification.create({
                recipient: restaurantId,
                title: 'New Order Received',
                message: `You have a new order ${order.orderId} for ₹${totalAmount}`,
                type: 'order_new',
                data: { orderId: order._id, orderRef: order.orderId }
            });
        } catch (_) { }

        // Populate for socket payload
        const populatedOrder = await Order.findById(order._id)
            .populate('user', 'name phone')
            .populate('items.product', 'name price image');

        // Emit real-time event to the restaurant
        try {
            getIO().to(`restaurant:${restaurantId}`).emit('new_order', populatedOrder);
        } catch (_) { }

        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get My Orders with Pagination
export const getMyOrders = async (req, res) => {
    try {
        const { page = 1, limit = 12, startDate, endDate } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        let query = { user: req.user.id };

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
            .populate('restaurant', 'restaurantName phone')
            .populate('items.product', 'name image')
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

// Get Single Order Details
export const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('restaurant', 'restaurantName phone address location deliveryRadius')
            .populate('items.product', 'name image price');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Verify order belongs to requesting user
        if (order.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update User Profile
export const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        console.log("UPDATE PROFILE - Request Body:", req.body);
        console.log("UPDATE PROFILE - Current User State:", { hasLocation: !!user.location, email: user.email });

        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.dob = req.body.dob || user.dob;
        user.city = req.body.city || user.city;
        user.userImage = req.body.image || user.userImage; // Using userImage field for profile pic

        if (req.body.location && req.body.location.lat !== undefined && req.body.location.lng !== undefined) {
            user.location = {
                lat: req.body.location.lat,
                lng: req.body.location.lng
            };
        }
        if (req.body.locationEnabled !== undefined) {
            user.locationEnabled = req.body.locationEnabled;
        }
        if (req.body.city) {
            user.city = req.body.city;
        }
        if (req.body.address) {
            user.address = req.body.address;
        }

        if (req.body.password) {
            user.password = req.body.password;
        }

        console.log("Saving user...");
        const updatedUser = await user.save();
        console.log("User saved successfully.");

        res.status(200).json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            role: updatedUser.role,
            dob: updatedUser.dob,
            city: updatedUser.city,
            image: updatedUser.userImage,
            userImage: updatedUser.userImage,
            location: updatedUser.location,
            locationEnabled: updatedUser.locationEnabled,
            isProfileComplete: !!(updatedUser.name && updatedUser.dob && updatedUser.city),
            token: generateToken(updatedUser._id)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
