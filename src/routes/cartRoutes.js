import express from 'express';
import { getCart, addToCart, removeFromCart, clearCart, updateCartItemQuantity } from '../controllers/cartController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // All cart routes need authentication

router.get('/', getCart);
router.post('/add', addToCart);
router.post('/remove', removeFromCart);
router.post('/update', updateCartItemQuantity);
router.delete('/', clearCart);

export default router;
