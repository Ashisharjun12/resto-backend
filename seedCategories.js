import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Category from './src/models/categoryModel.js';
import { config } from './src/config/config.js';

dotenv.config();

const categories = [
    { name: 'Pizza', image: 'https://cdn-icons-png.flaticon.com/512/3132/3132693.png' },
    { name: 'Burger', image: 'https://cdn-icons-png.flaticon.com/512/1046/1046784.png' },
    { name: 'Sushi', image: 'https://cdn-icons-png.flaticon.com/512/2252/2252075.png' },
    { name: 'Desserts', image: 'https://cdn-icons-png.flaticon.com/512/1375/1375195.png' },
    { name: 'Drinks', image: 'https://cdn-icons-png.flaticon.com/512/2405/2405451.png' }
];

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(config.mongoUri);
        // Clean existing categories
        await Category.deleteMany();
        await Category.insertMany(categories);
        console.log('Categories seeded successfully');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

connectDB();
