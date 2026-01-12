const mongoose = require('mongoose');

const BudgetSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    monthly: { type: Number, default: 0 },
    yearly: { type: Number, default: 0 },

    categoryLimits: [
        {
            name: { type: String, required: true },
            monthly: { type: Number, default: 0 },
            yearly: { type: Number, default: 0 },
        },
    ],
});

module.exports = mongoose.model('Budget', BudgetSchema);
