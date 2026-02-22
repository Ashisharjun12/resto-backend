
import express from 'express';
import upload from '../utils/multer.js';
import { getImageKitAuth, uploadImage } from '../controllers/uploadController.js';

const router = express.Router();

router.get('/auth', getImageKitAuth);
router.post('/', upload.any(), uploadImage);

export default router;
