const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Expense = require('../models/Expense');
const Category = require('../models/Category');
const Budget = require('../models/Budget');

// Get All Data
router.get('/data', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const expenses = await Expense.find({ userId }).sort({ date: -1 });
        const categories = await Category.find({ userId });
        let budget = await Budget.findOne({ userId });

        // Initialize default categories
        let categoryList = categories.map((c) => c.name);
        if (categoryList.length === 0) {
            const defaults = ['早餐', '午餐', '晚餐', '飲料', '日用品', '娛樂', '稅金', '保險', '薪水', '交通'];
            await Category.insertMany(defaults.map((name) => ({ userId, name })));
            categoryList = defaults;
        }

        if (!budget) {
            budget = await Budget.create({ userId, monthly: 10000, yearly: 120000 });
        }

        res.json({
            expenses: expenses.map((e) => ({ id: e._id, ...e._doc })),
            categories: categoryList,
            budget,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Expenses CRUD
router.post('/expenses', auth, async (req, res) => {
    try {
        const newExpense = new Expense({ ...req.body, userId: req.user.id });
        const saved = await newExpense.save();
        res.json({ id: saved._id, ...saved._doc });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/expenses/:id', auth, async (req, res) => {
    try {
        await Expense.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/expenses/:id', auth, async (req, res) => {
    try {
        const { category, amount, note, date, type } = req.body;
        const updatedExpense = await Expense.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { category, amount, note, date, type },
            { new: true }
        );
        if (!updatedExpense) return res.status(404).json({ error: 'Expense not found' });
        res.json({ id: updatedExpense._id, ...updatedExpense._doc });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Category
router.post('/categories', auth, async (req, res) => {
    try {
        await Category.create({ name: req.body.name, userId: req.user.id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/categories/:name', auth, async (req, res) => {
    try {
        await Category.deleteOne({ name: req.params.name, userId: req.user.id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Budget
router.put('/budget', auth, async (req, res) => {
    const { monthly, yearly, categoryLimits } = req.body;

    try {
        let budget = await Budget.findOne({ userId: req.user.id });
        if (!budget) {
            budget = new Budget({ userId: req.user.id });
        }

        budget.monthly = monthly;
        budget.yearly = yearly;

        if (categoryLimits) {
            budget.categoryLimits = categoryLimits;
        }
        await budget.save();
        res.json(budget);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
