import http from 'http';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { config } from './config/config.js';
import { initSocket } from './config/socket.js';
import cron from 'node-cron';
import { addReminderJob } from './queue/producer.js';
import './queue/worker.js';
import authRoutes from './routes/authRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import restaurantRoutes from './routes/restaurantRoutes.js';
import userRoutes from './routes/userRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import sponsorRequestRoutes from './routes/sponsorRequestRoutes.js';

const app = express();
app.use(express.json());
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    preflightContinue: false,
    optionsSuccessStatus: 200
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/sponsor-requests', sponsorRequestRoutes);

// Database Connection
mongoose.connect(config.mongoUri)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// HTTP server + Socket.IO
const server = http.createServer(app);
initSocket(server);

// Start Server
server.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);

    // Schedule subscription reminder check (Every day at 00:00)
    cron.schedule('0 0 * * *', async () => {
        await addReminderJob();
    });
});
