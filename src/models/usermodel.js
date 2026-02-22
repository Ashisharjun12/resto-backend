import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    phone: {
        type: String,
        unique: true,
        sparse: true, // Allow null/undefined for admin who might only have email (though phone is good for 2FA later)
    },
    email: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String, // Hashed password
        select: false // Don't return by default
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'restaurant'],
        default: 'user',
    },
    name: {
        type: String,
    },
    dob: {
        type: Date,
    },
    // For restaurants
    restaurantName: { type: String },
    address: { type: String },
    city: { type: String },
    image: { type: String }, // Restaurant Logo
    banner: { type: String }, // Restaurant Cover Image
    userImage: { type: String }, // Owner Profile Pic
    isOpen: { type: Boolean, default: true }, // Open/Closed status for restaurants
    locationEnabled: { type: Boolean, default: false },
    location: {
        lat: { type: Number },
        lng: { type: Number }
    },
    deliveryRadius: { type: Number, default: 5000 }, // in meters
    isVerified: { type: Boolean, default: false }, // Admin approval for restaurants
    subscriptionStatus: {
        type: String,
        enum: ['active', 'expired', 'pending_payment', 'blocked', 'none'],
        default: 'none'
    },
    isSubscriptionBlocked: { type: Boolean, default: false },
    subscriptionPlan: {
        type: String,
        enum: ['499', '699', '999', 'none'],
        default: 'none'
    },
    subscriptionExpiry: { type: Date },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    // Multi-Address Support
    addresses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address'
    }],
    defaultAddress: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address'
    },
    priority: {
        type: Number,
        default: 0
    },
    isBlocked: {
        type: Boolean,
        default: false
    }
});



const User = mongoose.model('User', userSchema);

export default User;
