import Cart from '../models/cartModel.js';
import Product from '../models/productModel.js';

// Get Cart
export const getCart = async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user._id }).populate('items.product', 'name image price isVeg description');

        if (!cart) {
            cart = await Cart.create({ user: req.user._id, items: [] });
        }

        res.status(200).json(cart);
    } catch (error) {
        console.error("Error in getCart:", error);
        res.status(500).json({ message: error.message });
    }
};

// Add Item to Cart
export const addToCart = async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;

        // Fetch product to get current price and restaurant
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        let cart = await Cart.findOne({ user: req.user._id });

        if (!cart) {
            cart = new Cart({ user: req.user._id, items: [] });
        }

        // Auto-clear cart if it has items from another restaurant
        if (cart.items.length > 0) {
            const existingRestaurant = cart.items[0].restaurant.toString();
            if (existingRestaurant !== product.restaurant.toString()) {
                // Clear existing items and reset total
                cart.items = [];
            }
        }

        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

        if (itemIndex > -1) {
            // Item exists, update quantity
            cart.items[itemIndex].quantity += quantity;
        } else {
            // Add new item
            cart.items.push({
                product: productId,
                quantity: quantity,
                price: product.price,
                restaurant: product.restaurant
            });
        }

        await cart.save();
        await cart.populate('items.product', 'name image price isVeg description');

        res.status(200).json(cart);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Remove Item from Cart
export const removeFromCart = async (req, res) => {
    try {
        const { productId } = req.body; // or req.params if we prefer DELETE /cart/:productId

        let cart = await Cart.findOne({ user: req.user._id });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

        if (itemIndex > -1) {
            // If we want to decrement, we'd need another endpoint or flag. 
            // Usually 'remove' means remove completely or decrement.
            // Let's assume this endpoint completely removes the item for now, 
            // or we could check for a 'fullRemove' flag.

            // Actually, for a standard '+' / '-' UI, we might want 'updateCartItem'.
            // But let's stick to the plan: removeItem usually implies removing the entry.
            // If the user wants to decrement, they can use a separate 'decrement' endpoint 
            // or we logic here. 
            // Let's implement: "Remove one instance" logic or "Remove all" logic?
            // The prompt/plan didn't specify. I'll stick to a flexible "update" approach or just strict remove.
            // Let's go with: if quantity provided, decrement. If not, remove.

            // Simplified for now based on store logic instructions: `removeItem` in store completely removed it?
            // Let's check store... store had `filter !== productId`. So it completely removes.
            // So I will completely remove it here too.
            cart.items.splice(itemIndex, 1);

            await cart.save();
            await cart.populate('items.product', 'name image price isVeg description');
            res.status(200).json(cart);
        } else {
            res.status(404).json({ message: 'Item not in cart' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update Cart Item Quantity (Add/Subtract)
export const updateCartItemQuantity = async (req, res) => {
    try {
        const { productId, action } = req.body; // action: 'increment' or 'decrement'

        let cart = await Cart.findOne({ user: req.user._id });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

        if (itemIndex > -1) {
            if (action === 'increment') {
                cart.items[itemIndex].quantity += 1;
            } else if (action === 'decrement') {
                cart.items[itemIndex].quantity -= 1;
                if (cart.items[itemIndex].quantity <= 0) {
                    cart.items.splice(itemIndex, 1);
                }
            }
            await cart.save();
            await cart.populate('items.product', 'name image price isVeg description');
            res.status(200).json(cart);
        } else {
            res.status(404).json({ message: 'Item not found in cart' });
        }

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}


// Clear Cart
export const clearCart = async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user._id });
        if (cart) {
            cart.items = [];
            cart.totalAmount = 0;
            await cart.save();
        }
        res.status(200).json({ message: 'Cart cleared', cart: { items: [], totalAmount: 0 } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
