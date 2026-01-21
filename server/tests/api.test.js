const request = require('supertest');
const mongoose = require('mongoose');
// Since server.js now exports 'app', we can usually use it directly.
const app = require('../server');
const User = require('../models/User');
const Expense = require('../models/Expense');

// Mock Mongoose Methods
jest.mock('../models/User');
jest.mock('../models/Expense');
jest.mock('../models/Category');
jest.mock('../models/Budget');
jest.mock('../models/RecurringExpense');

// Mock Auth Middleware to bypass real JWT checks in Data routes
jest.mock('../middleware/auth', () => (req, res, next) => {
    req.user = { id: 'mock_user_id' };
    next();
});

// Suppress console logs during tests, but allow error for debugging
beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => { });
    // jest.spyOn(console, 'error').mockImplementation(() => { });
});

describe('Auth Routes', () => {
    it('POST /api/auth/register should create user', async () => {
        User.findOne.mockResolvedValue(null); // No existing user
        User.create.mockResolvedValue({
            _id: 'new_user_id',
            email: 'test@example.com',
            isVerified: false
        });

        const res = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message');
    });

    it('POST /api/auth/login should return token', async () => {
        // ...
    });
});

describe('Data Routes (Mocked Auth)', () => {
    it('GET /api/data should return expenses', async () => {
        const mockExpense = { amount: 100, category: 'Food', date: '2025-01-01' };
        Expense.find.mockReturnValue({
            sort: jest.fn().mockResolvedValue([
                { _id: 'exp1', _doc: mockExpense, ...mockExpense }
            ])
        });


        // Mock Category.find to return empty or populated array
        require('../models/Category').find.mockResolvedValue([
            { name: 'Food' }, { name: 'Transport' }
        ]);

        // Mock Budget.findOne to return a default budget
        require('../models/Budget').findOne.mockResolvedValue({
            monthly: 10000,
            yearly: 120000
        });

        const res = await request(app).get('/api/data');
        if (res.statusCode !== 200) console.error('API Error:', res.body);


        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('expenses');
        expect(res.body.expenses[0].amount).toBe(100);
    });

    it('POST /api/expenses should create expense', async () => {
        const newExp = { amount: 50, category: 'Transport' };
        Expense.prototype.save = jest.fn().mockResolvedValue({
            _id: 'exp_new', ...newExp, _doc: newExp
        });

        const res = await request(app)
            .post('/api/expenses')
            .send(newExp);

        expect(res.statusCode).toEqual(200);
        expect(res.body.amount).toBe(50);
    });
});
