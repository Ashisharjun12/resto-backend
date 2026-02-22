
import twilio from 'twilio';
import { config } from '../config/config.js';
import Otp from '../models/otpModel.js';

const client = twilio(config.twilio.accountSid, config.twilio.authToken);

export const sendOtp = async (phone) => {
    try {
        // Generate random 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Save to DB (upsert to overwrite existing OTP for this phone)
        await Otp.findOneAndUpdate(
            { phone },
            { code, createdAt: Date.now() },
            { upsert: true, new: true }
        );

        // Demo numbers bypass
        const demoNumbers = ['+911234567890', '+919876543212'];
        if (demoNumbers.includes(phone)) {
            console.log(`[DEMO MODE] Bypassing OTP send for ${phone}. Use 123456`);
            return 'sent';
        }

        // Check if Twilio is enabled
        if (process.env.TWILIO_ENABLED !== 'true') {
            console.log(`[DEV MODE] OTP for ${phone}: ${code}`);
            return 'sent'; // Simulate success
        }

        // Send SMS
        await client.messages.create({
            body: `Your OTP is ${code}`,
            from: config.twilio.phoneNumber, // Ensure this is set in .env
            to: phone
        });

        return 'sent';
    } catch (error) {
        console.error("Twilio Error:", error);
        throw new Error('Failed to send OTP: ' + error.message);
    }
};

export const verifyOtp = async (phone, code) => {
    try {
        // Demo Bypass
        const demoNumbers = ['+911234567890', '+919876543212'];
        if (demoNumbers.includes(phone) && code === '123456') {
            console.log(`[DEMO MODE] OTP Verified for ${phone}: 123456`);
            return true;
        }

        // Dev Mode Bypass
        if (process.env.TWILIO_ENABLED !== 'true' && code === '123456') {
            console.log(`[DEV MODE] OTP Verified for ${phone}: 123456`);
            return true;
        }

        const record = await Otp.findOne({ phone });
        if (!record) return false;

        // Check if code matches
        const isValid = record.code === code;

        if (isValid) {
            // Optional: Delete OTP after successful verification to prevent replay
            await Otp.deleteOne({ phone });
        }

        return isValid;
    } catch (error) {
        throw error;
    }
};
