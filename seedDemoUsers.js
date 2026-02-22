import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/usermodel.js';
import { config } from './src/config/config.js';

dotenv.config();

const demoUsers = [
    {
        name: 'Demo User',
        phone: '1234567890',
        role: 'user',
        isVerified: true
    },
    {
        name: 'Demo Restaurant Admin',
        phone: '9876543212',
        role: 'restaurant',
        restaurantName: 'Demo Restaurant',
        isVerified: true,
        address: '123 Demo Street',
        city: 'Demo City'
    }
];

const connectDB = async () => {
    try {
        await mongoose.connect(config.mongoUri);
        console.log('Connected to MongoDB');

        for (const userData of demoUsers) {
            const exists = await User.findOne({ phone: userData.phone });
            if (exists) {
                await User.findOneAndUpdate({ phone: userData.phone }, userData);
                console.log(`Updated demo user: ${userData.phone}`);
            } else {
                await User.create(userData);
                console.log(`Created demo user: ${userData.phone}`);
            }
        }

        console.log('Demo users seeded successfully');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

connectDB();
