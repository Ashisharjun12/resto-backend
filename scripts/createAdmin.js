
import mongoose from 'mongoose';
import User from '../src/models/usermodel.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../.env');

dotenv.config({ path: envPath });

const createAdmin = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/food_delivery_app';

        console.log(`Connecting to MongoDB...`);
        await mongoose.connect(mongoUri);
        console.log('✅ MongoDB Connected');

        const adminEmail = 'ashishrahul748@gmail.com';
        const adminPassword = 'admin1234';

        const existingAdmin = await User.findOne({ email: adminEmail });

        if (existingAdmin) {
            console.log(`Admin ${adminEmail} already exists. Updating password...`);
            const salt = await bcrypt.genSalt(10);
            existingAdmin.password = await bcrypt.hash(adminPassword, salt);
            existingAdmin.role = 'admin';
            existingAdmin.isVerified = true;
            await existingAdmin.save();
            console.log('✅ Admin password updated.');
        } else {
            console.log(`Creating new Admin user (${adminEmail})...`);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(adminPassword, salt);

            const admin = new User({
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
                name: 'Super Admin',
                isVerified: true
            });
            await admin.save();
            console.log('✅ Admin user created successfully.');
        }

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

createAdmin();
