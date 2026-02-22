import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { ValkeyConnection } from './valkey.js';
import IORedis from 'ioredis';
import { config } from './config.js';

let io;

/** Call once from server.js with the httpServer instance */
export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket', 'polling']
    });

    // Redis pub/sub adapter for horizontal scaling
    const pubClient = ValkeyConnection;            // existing connection
    const subClient = new IORedis(config.redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        tls: config.redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    });

    io.adapter(createAdapter(pubClient, subClient));
    console.log('Socket.IO Redis adapter attached');

    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        // Restaurant joins its own room to receive new orders
        socket.on('join_restaurant', ({ restaurantId }) => {
            if (restaurantId) {
                socket.join(`restaurant:${restaurantId}`);
                console.log(`Socket ${socket.id} joined restaurant:${restaurantId}`);
            }
        });

        // User joins their room to receive order status updates
        socket.on('join_user', ({ userId }) => {
            if (userId) {
                socket.join(`user:${userId}`);
                console.log(`Socket ${socket.id} joined user:${userId}`);
            }
        });

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });

    return io;
};

/** Get the io instance anywhere in the app */
export const getIO = () => {
    if (!io) throw new Error('Socket.IO not initialised — call initSocket(httpServer) first');
    return io;
};
