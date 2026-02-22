import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    price: {
        type: Number,
        required: true
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Restaurant is a User with role 'restaurant'
        required: true
    }
});

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true // One cart per user
    },
    items: [cartItemSchema],
    totalAmount: {
        type: Number,
        required: true,
        default: 0
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware to calculate total amount before saving
cartSchema.pre('save', async function () {
    if (this.items) {
        this.totalAmount = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }
    this.updatedAt = Date.now();
});

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;
