import Address from '../models/addressModel.js';

// Add New Address
export const addAddress = async (req, res) => {
    try {
        const { title, address, city, location, isDefault } = req.body;

        // Check if this is the first address, if so make it default
        const addressCount = await Address.countDocuments({ user: req.user.id });
        const shouldBeDefault = addressCount === 0 || isDefault;

        const newAddress = new Address({
            user: req.user.id,
            title,
            address,
            city,
            location,
            isDefault: shouldBeDefault
        });

        await newAddress.save();
        res.status(201).json(newAddress);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get All Addresses
export const getAddresses = async (req, res) => {
    try {
        const addresses = await Address.find({ user: req.user.id }).sort({ isDefault: -1, createdAt: -1 });
        res.status(200).json(addresses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Set Address as Default
export const setDefaultAddress = async (req, res) => {
    try {
        const address = await Address.findOne({ _id: req.params.id, user: req.user.id });
        if (!address) {
            return res.status(404).json({ message: 'Address not found' });
        }

        // Unset other defaults
        await Address.updateMany(
            { user: req.user.id, _id: { $ne: req.params.id } },
            { $set: { isDefault: false } }
        );

        address.isDefault = true;
        await address.save();

        res.status(200).json(address);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete Address
export const deleteAddress = async (req, res) => {
    try {
        const address = await Address.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (!address) {
            return res.status(404).json({ message: 'Address not found' });
        }
        res.status(200).json({ message: 'Address deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
