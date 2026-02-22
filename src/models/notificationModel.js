import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['order_new', 'order_status', 'payment', 'subscription', 'general', 'promotional', 'alert'],
        default: 'general'
    },
    data: {
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
        orderRef: String
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
