import express from 'express';
import {
    getAllRestaurants, getRestaurantMenu, getRestaurantCategories,
    getRestaurantById, createOrder, getMyOrders, getOrderById, updateUserProfile
} from '../controllers/userController.js';
import { getMyNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../controllers/restaurantController.js';
import { getActiveSponsors } from '../controllers/sponsorController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/restaurants', getAllRestaurants);
router.get('/sponsors', getActiveSponsors);
router.get('/restaurants/:restaurantId/categories', getRestaurantCategories);
router.get('/restaurants/:restaurantId/menu', getRestaurantMenu);
router.get('/restaurants/:id', getRestaurantById);
router.post('/orders', protect, createOrder);
router.get('/orders', protect, getMyOrders);
router.get('/orders/:id', protect, getOrderById);
router.put('/profile', protect, updateUserProfile);
router.get('/notifications', protect, getMyNotifications);
router.put('/notifications/read-all', protect, markAllNotificationsAsRead);
router.put('/notifications/:id/read', protect, markNotificationAsRead);

export default router;
