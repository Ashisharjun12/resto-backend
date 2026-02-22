import express from 'express';
import * as reviewController from '../controllers/reviewController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, reviewController.createReview);
router.get('/restaurant/:restaurantId', reviewController.getRestaurantReviews);
router.get('/order/:orderId', protect, reviewController.getReviewByOrder);

export default router;
