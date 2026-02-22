import dotenv from 'dotenv';

dotenv.config();

export const config = {
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    port: process.env.PORT || 5000,
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/food_delivery',
    jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret',
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        serviceSid: process.env.TWILIO_SERVICE_SID,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER
    },
    imagekit: {
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
        urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
    },
    admin: {
        upiId: process.env.ADMIN_UPI_ID || '8757641329@ybl'
    }
};
