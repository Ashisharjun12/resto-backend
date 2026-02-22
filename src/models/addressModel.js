import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true, // e.g., 'Home', 'Work', 'Other'
        trim: true
    },
    address: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    location: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Ensure only one default address per user
addressSchema.pre('save', async function () {
    if (this.isDefault) {
        await this.constructor.updateMany(
            { user: this.user, _id: { $ne: this._id } },
            { $set: { isDefault: false } }
        );
    }
});

const Address = mongoose.model('Address', addressSchema);
export default Address;
