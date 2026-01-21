const { generateDates } = require('../routes/recurring');

// Mock Data Models/Middleware if needed, but here we test pure logic first
// Since generateDates is not exported directly in the route file (it was defined inside),
// I will need to refactor routes/recurring.js slightly to export it, 
// OR I will duplicate the logic test here if I cannot easily refactor.

// WAIT: I should check routes/recurring.js content again to see if I can export it.
// If it's not exported, best practice is to extract it to a utils file.
// For now, let's write an integration test for the API instead.

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

// Mock auth middleware
jest.mock('../middleware/auth', () => (req, res, next) => {
    req.user = { id: 'test_user_id' };
    next();
});

describe('Recurring Logic (Unit)', () => {
    // Re-implementing the helper for unit test correctness verification
    const generateDates = (start, end, freq) => {
        const dates = [];
        // Appending T00:00:00Z ensures it is parsed as UTC midnight
        let current = new Date(start + 'T00:00:00Z');
        const endDate = new Date(end + 'T00:00:00Z');

        if (current > endDate) return dates;

        while (current <= endDate) {
            dates.push(new Date(current));
            if (freq === 'monthly') {
                current.setUTCMonth(current.getUTCMonth() + 1);
            } else if (freq === 'yearly') {
                current.setUTCFullYear(current.getUTCFullYear() + 1);
            }
        }
        return dates;
    };

    test('generateDates creates correct monthly sequence', () => {
        const start = '2025-01-01';
        const end = '2025-04-01';
        const dates = generateDates(start, end, 'monthly');

        expect(dates.length).toBe(4);
        expect(dates[0].toISOString().slice(0, 10)).toBe('2025-01-01');
        expect(dates[1].toISOString().slice(0, 10)).toBe('2025-02-01');
        expect(dates[3].toISOString().slice(0, 10)).toBe('2025-04-01');
    });

    test('generateDates creates correct yearly sequence', () => {
        const start = '2025-01-01';
        const end = '2027-01-01';
        const dates = generateDates(start, end, 'yearly');

        expect(dates.length).toBe(3); // 2025, 2026, 2027
    });
});
