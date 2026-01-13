const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: String,
    category: String,
    amount: Number,
    note: String,
    type: { type: String, enum: ['expense', 'income'], default: 'expense', required: true },
    createdAt: { type: Date, default: Date.now },
    recurringId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecurringExpense', default: null },
});

module.exports = mongoose.model('Expense', ExpenseSchema);
