
import City from '../models/cityModel.js';

// Create City
export const createCity = async (req, res) => {
    try {
        const { name } = req.body;
        const city = new City({ name });
        await city.save();
        res.status(201).json(city);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Cities
export const getCities = async (req, res) => {
    try {
        const cities = await City.find({ isActive: true });
        res.status(200).json(cities);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update City
export const updateCity = async (req, res) => {
    try {
        const { name } = req.body;
        const city = await City.findByIdAndUpdate(
            req.params.id,
            { name },
            { new: true, runValidators: true }
        );
        if (!city) return res.status(404).json({ message: 'City not found' });
        res.status(200).json(city);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete City
export const deleteCity = async (req, res) => {
    try {
        await City.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'City deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
