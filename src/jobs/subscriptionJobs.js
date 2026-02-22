import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import User from '../models/usermodel.js';
import Notification from '../models/notificationModel.js';
import { getIO } from '../socket.js';
import dotenv from 'dotenv';

dotenv.config();

const connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null
});

// Create Queue
export const reminderQueue = new Queue('subscriptionReminders', { connection });

// Define Worker
const worker = new Worker('subscriptionReminders', async job => {
    console.log('[Job] Checking for expiring subscriptions...');

    // Find users whose subscription expires in exactly 3 days or 1 day
    const threeDaysAway = new Date();
    threeDaysAway.setDate(threeDaysAway.getDate() + 3);
    const oneDayAway = new Date();
    oneDayAway.setDate(oneDayAway.getDate() + 1);

    const startOf3d = new Date(threeDaysAway.setHours(0, 0, 0, 0));
    const endOf3d = new Date(threeDaysAway.setHours(23, 59, 59, 999));

    const startOf1d = new Date(oneDayAway.setHours(0, 0, 0, 0));
    const endOf1d = new Date(oneDayAway.setHours(23, 59, 59, 999));

    const usersToRemind = await User.find({
        role: 'restaurant',
        subscriptionStatus: 'active',
        $or: [
            { subscriptionExpiry: { $gte: startOf3d, $lte: endOf3d } },
            { subscriptionExpiry: { $gte: startOf1d, $lte: endOf1d } }
        ]
    });

    console.log(`[Job] Found ${usersToRemind.length} users to remind.`);

    for (const user of usersToRemind) {
        const daysRemaining = Math.ceil((user.subscriptionExpiry - new Date()) / (1000 * 60 * 60 * 24));
        const message = `Your subscription plan (${user.subscriptionPlan}) expires in ${daysRemaining} day(s). Please renew to avoid service interruption.`;

        // 1. Create Persistent Notification
        try {
            await Notification.create({
                recipient: user._id,
                title: 'Subscription Renewal',
                message,
                type: 'subscription'
            });
        } catch (_) { }

        // 2. Emit Real-time Socket Notification
        try {
            const io = getIO();
            io.to(`restaurant:${user._id.toString()}`).emit('new_notification', {
                title: 'Subscription Renewal',
                message,
                type: 'subscription'
            });
        } catch (_) { }
    }
}, { connection });

worker.on('completed', job => {
    console.log(`[Job] Reminder job ${job.id} completed.`);
});

worker.on('failed', (job, err) => {
    console.error(`[Job] Reminder job ${job.id} failed:`, err);
});
