const mongoose = require('mongoose');

const BudgetSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    monthly: Number,
    yearly: Number,
});

module.exports = mongoose.model('Budget', BudgetSchema);
