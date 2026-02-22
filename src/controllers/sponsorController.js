import Sponsor from '../models/sponsorModel.js';

// Admin: Create Sponsor
export const createSponsor = async (req, res) => {
    try {
        const sponsor = new Sponsor(req.body);
        await sponsor.save();
        res.status(201).json(sponsor);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin: Update Sponsor
export const updateSponsor = async (req, res) => {
    try {
        const sponsor = await Sponsor.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!sponsor) return res.status(404).json({ message: 'Sponsor not found' });
        res.status(200).json(sponsor);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin: Delete Sponsor
export const deleteSponsor = async (req, res) => {
    try {
        const sponsor = await Sponsor.findByIdAndDelete(req.params.id);
        if (!sponsor) return res.status(404).json({ message: 'Sponsor not found' });
        res.status(200).json({ message: 'Sponsor deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Public: Get All Active Sponsors
export const getActiveSponsors = async (req, res) => {
    try {
        const sponsors = await Sponsor.find({ isActive: true }).sort({ priority: -1 });
        res.status(200).json(sponsors);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin: Get All Sponsors (including inactive)
export const getAllSponsors = async (req, res) => {
    try {
        const sponsors = await Sponsor.find({}).sort({ createdAt: -1 });
        res.status(200).json(sponsors);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
