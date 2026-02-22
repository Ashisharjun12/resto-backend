import SponsorRequest from '../models/sponsorRequestModel.js';

export const createSponsorRequest = async (req, res) => {
    try {
        const { message } = req.body;
        const sponsorRequest = new SponsorRequest({
            restaurant: req.user._id,
            message
        });
        await sponsorRequest.save();
        res.status(201).json({ message: 'Sponsor request sent successfully', sponsorRequest });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getSponsorRequests = async (req, res) => {
    try {
        const requests = await SponsorRequest.find()
            .populate('restaurant', 'name email restaurantName')
            .sort({ createdAt: -1 });
        res.status(200).json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateSponsorRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const request = await SponsorRequest.findByIdAndUpdate(id, { status }, { new: true });
        if (!request) return res.status(404).json({ message: 'Request not found' });
        res.status(200).json(request);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getMySponsorRequests = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const status = req.query.status;
        const sort = req.query.sort || 'newest';

        const query = { restaurant: req.user._id };
        if (status && status !== 'all') {
            query.status = status;
        }

        let sortQuery = { createdAt: -1 };
        if (sort === 'oldest') sortQuery = { createdAt: 1 };
        else if (sort === 'status') sortQuery = { status: 1, createdAt: -1 };

        const requests = await SponsorRequest.find(query)
            .sort(sortQuery)
            .skip(skip)
            .limit(limit);

        const total = await SponsorRequest.countDocuments(query);

        res.status(200).json({
            requests,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
