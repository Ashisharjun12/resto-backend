import express from 'express';
import { getRestaurants, getRestaurantDetails, verifyRestaurant, addRestaurant, getSubscriptions, updateSubscriptionStatus, createCategory, getCategories, updateRestaurantPriority, toggleSubscriptionBlock, getRestaurantSubscriptionHistory, getUsers, getUserDetails, toggleUserStatus, sendNotification, getSentNotifications, sendSubscriptionExpiryAlerts, getSettings, updateSettings } from '../controllers/adminController.js';
import { createCity, getCities, deleteCity, updateCity } from '../controllers/cityController.js';
import { createSponsor, updateSponsor, deleteSponsor, getAllSponsors } from '../controllers/sponsorController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public Routes (Accessible by specific apps/users without admin token)
router.get('/categories', getCategories);
router.get('/cities', getCities);

// Protected Admin Routes
router.use(protect, admin);

router.get('/restaurants', getRestaurants);
router.get('/restaurants/:id', getRestaurantDetails);
router.post('/restaurants', addRestaurant);
router.put('/restaurants/:id/verify', verifyRestaurant);
router.put('/restaurants/:id/priority', updateRestaurantPriority);
router.get('/subscriptions', getSubscriptions);
router.put('/subscriptions/:id', updateSubscriptionStatus);
router.patch('/restaurants/:id/toggle-subscription-block', toggleSubscriptionBlock);
router.get('/restaurants/:id/subscriptions', getRestaurantSubscriptionHistory);
router.post('/categories', admin, createCategory);

// Cities Management
router.post('/cities', admin, createCity);
router.put('/cities/:id', admin, updateCity);
router.delete('/cities/:id', admin, deleteCity);

// Sponsors Management
router.get('/sponsors', getAllSponsors);
router.post('/sponsors', createSponsor);
router.put('/sponsors/:id', updateSponsor);
router.delete('/sponsors/:id', deleteSponsor);

// Users Management
router.get('/users', getUsers);
router.get('/users/:id', getUserDetails);
router.patch('/users/:id/toggle-status', toggleUserStatus);

// Notifications Management
router.get('/notifications', getSentNotifications);
router.post('/notifications/send', sendNotification);
router.post('/notifications/send-expiry-alerts', sendSubscriptionExpiryAlerts);

// Global Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

export default router;
