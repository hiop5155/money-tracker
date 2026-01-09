const mongoose = require('mongoose');

const RecurringExpenseSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    frequency: { type: String, enum: ['monthly', 'yearly'], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    note: { type: String },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('RecurringExpense', RecurringExpenseSchema);
