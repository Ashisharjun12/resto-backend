import mongoose from 'mongoose';

const sponsorRequestSchema = new mongoose.Schema({
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'contacted', 'resolved'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const SponsorRequest = mongoose.model('SponsorRequest', sponsorRequestSchema);

export default SponsorRequest;
