import express from "express"
import { addAddress, getAddresses, deleteAddress, setDefaultAddress } from '../controllers/addressController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/', addAddress);
router.get('/', getAddresses);
router.put('/:id/default', setDefaultAddress);
router.delete('/:id', deleteAddress);

export default router;
