const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const RecurringExpense = require('../models/RecurringExpense');
const Expense = require('../models/Expense');

// --- calculate all occurrence dates based on frequency ---
const generateDates = (start, end, freq) => {
    const dates = [];
    let current = new Date(start);
    const endDate = new Date(end);

    if (current > endDate) return dates;

    while (current <= endDate) {
        dates.push(new Date(current));
        if (freq === 'monthly') {
            current.setMonth(current.getMonth() + 1);
        } else if (freq === 'yearly') {
            current.setFullYear(current.getFullYear() + 1);
        }
    }
    return dates;
};

// get all recurring expenses
router.get('/', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const list = await RecurringExpense.find({ userId }).sort({ createdAt: -1 });
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// add new recurring expense
router.post('/', auth, async (req, res) => {
    try {
        const { title, amount, category, frequency, startDate, endDate, note } = req.body;
        const userId = req.user.id;

        const newRecurring = new RecurringExpense({
            userId,
            title,
            amount,
            category,
            frequency,
            startDate,
            endDate,
            note,
        });

        const savedRecurring = await newRecurring.save();
        const dates = generateDates(startDate, endDate, frequency);
        const expensesToInsert = dates.map((dateObj) => ({
            userId,
            date: dateObj.toISOString().split('T')[0],
            category,
            amount,
            note: `(固定) ${note || title}`,
            recurringId: savedRecurring._id,
        }));

        if (expensesToInsert.length > 0) {
            await Expense.insertMany(expensesToInsert);
        }

        res.json(savedRecurring);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// edit recurring expense
router.put('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { title, amount, category, frequency, startDate, endDate, note } = req.body;

        const updatedRecurring = await RecurringExpense.findOneAndUpdate(
            { _id: id, userId },
            { title, amount, category, frequency, startDate, endDate, note },
            { new: true }
        );

        if (!updatedRecurring) {
            return res.status(404).json({ error: 'Recurring expense not found' });
        }
        await Expense.deleteMany({ recurringId: id, userId });
        const dates = generateDates(startDate, endDate, frequency);
        const expensesToInsert = dates.map((dateObj) => ({
            userId,
            date: dateObj.toISOString().split('T')[0],
            category,
            amount,
            note: `(固定) ${note || title}`,
            recurringId: id,
        }));

        if (expensesToInsert.length > 0) {
            await Expense.insertMany(expensesToInsert);
        }

        res.json(updatedRecurring);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// delete recurring expense (and associated expenses)
router.delete('/:id', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await RecurringExpense.findOneAndDelete({ _id: req.params.id, userId });

        if (!result) {
            return res.status(404).json({ error: 'Recurring expense not found' });
        }

        await Expense.deleteMany({ recurringId: req.params.id, userId });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
