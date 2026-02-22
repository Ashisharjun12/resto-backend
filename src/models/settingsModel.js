import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
    adminUpiId: {
        type: String,
        default: '8757641329@ybl'
    },
    adminQrCodeUrl: {
        type: String,
        default: ''
    }
}, { timestamps: true });

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
