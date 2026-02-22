import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null
});

// Create Queue
export const reminderQueue = new Queue('subscriptionReminders', { connection });

export const addReminderJob = async () => {
    console.log('[Queue] Adding checkReminders job...');
    await reminderQueue.add('checkReminders', {}, {
        removeOnComplete: true,
        removeOnFail: true
    });
};
