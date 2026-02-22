import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import User from '../models/usermodel.js';
import Notification from '../models/notificationModel.js';
import { getIO } from '../config/socket.js'; // Fixed import path
import dotenv from 'dotenv';

dotenv.config();

const connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null
});

const worker = new Worker('subscriptionReminders', async job => {
    console.log('[Worker] Checking for expiring subscriptions (2 days before)...');

    // Find users whose subscription expires in exactly 2 days
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);

    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const usersToRemind = await User.find({
        role: 'restaurant',
        subscriptionStatus: 'active',
        subscriptionExpiry: { $gte: startOfDay, $lte: endOfDay }
    });

    console.log(`[Worker] Found ${usersToRemind.length} users to remind.`);

    for (const user of usersToRemind) {
        const message = `Your subscription plan (${user.subscriptionPlan}) expires in 2 days. Please renew to avoid service interruption.`;

        // 1. Create Persistent Notification
        try {
            await Notification.create({
                recipient: user._id,
                title: 'Subscription Renewal',
                message,
                type: 'subscription'
            });
        } catch (err) {
            console.error('[Worker] Failed to create notification:', err.message);
        }

        // 2. Emit Real-time Socket Notification
        try {
            const io = getIO();
            if (io) {
                io.to(`restaurant:${user._id.toString()}`).emit('new_notification', {
                    title: 'Subscription Renewal',
                    message,
                    type: 'subscription'
                });
            }
        } catch (err) {
            console.error('[Worker] Failed to emit socket notification:', err.message);
        }
    }
}, { connection });

worker.on('completed', job => {
    console.log(`[Worker] Job ${job.id} completed successfully.`);
});

worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job.id} failed:`, err.message);
});

export default worker;
