import mongoose from 'mongoose';
import Counter from './counterModel.js';

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            required: true
        }
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['cod'],
        default: 'cod',
        required: true
    },
    paymentScreenshot: { // For User -> Restaurant UPI
        type: String
    },
    deliveryAddress: { // Snapshot of address
        address: String,
        city: String,
        location: {
            lat: Number,
            lng: Number
        }
    }
}, { timestamps: true });

orderSchema.pre('save', async function () {
    if (!this.isNew) return;

    const counter = await Counter.findByIdAndUpdate(
        { _id: 'orderId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    this.orderId = `#ORD-${counter.seq}`;
});


const Order = mongoose.model('Order', orderSchema);
export default Order;
