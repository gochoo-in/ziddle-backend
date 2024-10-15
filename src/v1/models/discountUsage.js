import mongoose from 'mongoose';

const discountUsageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    discountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Discount',
        required: true,
    },
    appliedAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.model('DiscountUsage', discountUsageSchema);
