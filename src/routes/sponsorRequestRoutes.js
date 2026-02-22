import express from 'express';
import { createSponsorRequest, getSponsorRequests, updateSponsorRequestStatus, getMySponsorRequests } from '../controllers/sponsorRequestController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createSponsorRequest);
router.get('/my-requests', protect, getMySponsorRequests);
router.get('/', protect, adminOnly, getSponsorRequests);
router.patch('/:id', protect, adminOnly, updateSponsorRequestStatus);

export default router;
