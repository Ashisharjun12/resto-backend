import express from 'express';
import {
    addProduct, updateProduct, deleteProduct, getMyProducts,
    updateOrderStatus, getMyOrders, submitSubscription, updateProfile,
    toggleOpenStatus, getRestaurantCategories, createCategory,
    getMyNotifications, markNotificationAsRead, markAllNotificationsAsRead,
    getOrderDetails, getPaymentSettings
} from '../controllers/restaurantController.js';
import { getRevenueStats } from '../controllers/analyticsController.js';
import { protect, restaurantOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/payment-settings', protect, getPaymentSettings);
router.post('/products', protect, restaurantOnly, addProduct);
router.get('/products', protect, restaurantOnly, getMyProducts);
router.put('/products/:id', protect, restaurantOnly, updateProduct);
router.delete('/products/:id', protect, restaurantOnly, deleteProduct);

router.get('/orders', protect, restaurantOnly, getMyOrders);
router.get('/orders/:id', protect, restaurantOnly, getOrderDetails);
router.put('/orders/:id/status', protect, restaurantOnly, updateOrderStatus);

// Notifications
router.get('/notifications', protect, restaurantOnly, getMyNotifications);
router.put('/notifications/read-all', protect, restaurantOnly, markAllNotificationsAsRead);
router.put('/notifications/:id/read', protect, restaurantOnly, markNotificationAsRead);

router.post('/subscription', protect, restaurantOnly, submitSubscription);
router.put('/profile', protect, restaurantOnly, updateProfile);
router.put('/toggle-status', protect, restaurantOnly, toggleOpenStatus);
router.get('/categories', protect, restaurantOnly, getRestaurantCategories);
router.post('/categories', protect, restaurantOnly, createCategory);

// Analytics
router.get('/analytics/revenue', protect, restaurantOnly, getRevenueStats);

export default router;
