
import imagekit from '../utils/imagekit.js';
import fs from 'fs';

export const getImageKitAuth = (req, res) => {
    try {
        const authenticationParameters = imagekit.getAuthenticationParameters();
        res.status(200).json(authenticationParameters);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const uploadImage = async (req, res) => {
    try {
        // Handle both single file (req.file) and any/files (req.files)
        const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);

        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        // Read file buffer
        const fileBuffer = fs.readFileSync(file.path);

        const response = await imagekit.upload({
            file: fileBuffer, // required
            fileName: file.originalname, // required
            folder: '/food-delivery/categories'
        });

        // Clean up local file
        fs.unlinkSync(file.path);

        res.status(200).json({ url: response.url, fileId: response.fileId });
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ message: 'Image upload failed', error: error.message });
    }
};
