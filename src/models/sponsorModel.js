import mongoose from 'mongoose';

const sponsorSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    subtitle: {
        type: String,
        trim: true
    },
    image: {
        type: String,
        required: true
    },
    link: {
        type: String, // Can be a URL or a deep link
        default: ''
    },
    type: {
        type: String,
        enum: ['banner', 'restaurant_promotion'],
        default: 'banner'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    priority: {
        type: Number,
        default: 0
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // For restaurant_promotion type
    }
}, { timestamps: true });

const Sponsor = mongoose.model('Sponsor', sponsorSchema);
export default Sponsor;
