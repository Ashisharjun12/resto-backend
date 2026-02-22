
import mongoose from 'mongoose';

const categorySchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    image: {
        type: String, // Optional URL for category icon/image
        default: ''
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null // null means it's a global category
    }
}, {
    timestamps: true
});

const Category = mongoose.model('Category', categorySchema);

export default Category;
