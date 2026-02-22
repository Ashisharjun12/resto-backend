
import { sendOtp, verifyOtp } from '../services/otpService.js';
import User from '../models/usermodel.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { config } from '../config/config.js';

const generateToken = (id) => {
    return jwt.sign({ id }, config.jwtSecret, { expiresIn: '30d' });
};

export const sendOtpController = async (req, res) => {
    const { phone } = req.body;
    try {
        const status = await sendOtp(phone);
        res.status(200).json({ success: true, message: 'OTP sent successfully', status });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const verifyOtpController = async (req, res) => {
    const { phone, code, role, name } = req.body;
    try {
        const isValid = await verifyOtp(phone, code);
        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        let user = await User.findOne({ phone });
        if (!user) {
            const roleToAssign = (role === 'restaurant') ? 'restaurant' : 'user';
            user = new User({
                phone,
                role: roleToAssign,
                name: name || undefined, // Save name if provided
                isVerified: roleToAssign === 'restaurant' ? false : true
            });
            await user.save();
        }

        const token = generateToken(user._id);

        res.status(200).json({ success: true, token, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Email/Password Login (Admin)
export const loginController = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
        }

        const token = generateToken(user._id);

        res.status(200).json({ success: true, token, user: { ...user._doc, password: undefined } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Register Restaurant
export const registerRestaurant = async (req, res) => {
    const { name, email, phone, restaurantName, address, city, otp } = req.body;
    try {
        // Verify OTP first using the service or a direct check if using Twilio Verify API structure in verifyOtp
        // For simplicity/reusability, we can use verifyOtp service.
        const isValid = await verifyOtp(phone, otp);
        if (!isValid) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        let user = await User.findOne({ phone });
        if (user) return res.status(400).json({ message: 'User already exists' });

        user = new User({
            name,
            email,
            phone,
            role: 'restaurant',
            restaurantName,
            address,
            city,
            image: req.body.image,
            banner: req.body.banner,
            userImage: req.body.userImage,
            location: req.body.location, // { lat: ..., lng: ... }
            deliveryRadius: req.body.deliveryRadius || 5000,
            isVerified: false // Requires admin approval
        });

        await user.save();
        const token = generateToken(user._id);
        res.status(201).json({ token, user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Current User
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const userObj = user.toObject();
        res.status(200).json({
            ...userObj,
            image: user.image || user.userImage, // Support both restaurant logo and user profile pic
            isProfileComplete: !!(user.name && user.dob && user.city)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const checkUser = async (req, res) => {
    const { phone } = req.body;
    try {
        const user = await User.findOne({ phone });
        if (user) {
            return res.status(200).json({ exists: true, message: 'User already exists' });
        }
        res.status(200).json({ exists: false, message: 'User does not exist' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
