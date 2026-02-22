import express from 'express';
import { sendOtpController, verifyOtpController, loginController, registerRestaurant, getMe, checkUser } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/send-otp', sendOtpController);
router.post('/verify-otp', verifyOtpController);
router.post('/register-restaurant', registerRestaurant);
router.post('/login', loginController);
router.post('/check-user', checkUser);
router.get('/me', protect, getMe);

export default router;
