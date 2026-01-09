const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const auth = require('../middleware/auth');
const Expense = require('../models/Expense');
const Category = require('../models/Category');

// Setup Multer (Temporary storage)
const upload = multer({ dest: 'uploads/' });

router.post('/csv', auth, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const results = [];
    const userId = req.user.id;
    let successCount = 0;
    let skipCount = 0;

    console.log('--- Start CSV Import ---');

    fs.createReadStream(req.file.path)
        .pipe(
            csv({
                // Key fix: Automatically remove BOM (Byte Order Mark) and surrounding whitespace from headers
                mapHeaders: ({ header }) => header.trim().replace(/^\ufeff/, ''),
            })
        )
        .on('data', (data) => {
            // Debug: Print raw row data
            // console.log('Raw Row:', data);

            // 1. Filtering Logic: Only import "Expenditure" (支)
            // Field is usually '收支區分' (Type), value is '支' (Expense)
            const type = data['收支區分'];
            if (type && type !== '支') {
                skipCount++;
                return;
            }

            // 2. Date Conversion: 20260108 -> 2026-01-08
            // Ensure conversion to string as some CSV parsers might read pure numbers as Number
            let dateStr = String(data['日期'] || '').trim();

            if (dateStr.length === 8) {
                // Format 20260108
                dateStr = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
            } else if (dateStr.includes('/')) {
                // Format 2026/01/08
                dateStr = dateStr.replace(/\//g, '-');
            } else if (!dateStr) {
                console.warn('Skipping invalid date:', data);
                skipCount++;
                return;
            }

            // 3. Amount Processing (Remove commas or non-numeric characters)
            let amountRaw = String(data['金額'] || '0').replace(/[^0-9.-]+/g, '');
            let amount = parseInt(amountRaw, 10);

            if (isNaN(amount) || amount <= 0) {
                console.warn('Skipping invalid amount:', data);
                skipCount++;
                return;
            }

            // 4. Construct Expense Object
            results.push({
                userId,
                date: dateStr,
                category: data['類別'] || 'Uncategorized',
                amount: amount,
                note: data['備註'] || '',
            });
            successCount++;
        })
        .on('end', async () => {
            try {
                console.log(`Parsing complete: Success ${successCount}, Skipped ${skipCount}`);

                if (results.length > 0) {
                    // A. Batch Insert Expenses
                    await Expense.insertMany(results);

                    // B. Automatically create new categories
                    const incomingCategories = [...new Set(results.map((r) => r.category))];
                    const existingCategories = await Category.find({ userId });
                    const existingNames = existingCategories.map((c) => c.name);

                    const newCategoriesToCreate = incomingCategories
                        .filter((name) => !existingNames.includes(name))
                        .map((name) => ({ userId, name }));

                    if (newCategoriesToCreate.length > 0) {
                        await Category.insertMany(newCategoriesToCreate);
                        console.log(`Automatically created ${newCategoriesToCreate.length} new categories`);
                    }
                }

                // Delete temporary file
                if (fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }

                res.json({
                    success: true,
                    count: results.length,
                    message: `Import successful! Added ${results.length} expenses (Skipped ${skipCount} non-expense items)`,
                });
            } catch (err) {
                console.error('Database write failed:', err);
                res.status(500).json({ error: 'Database error during import' });
            }
        })
        .on('error', (err) => {
            console.error('CSV Parse Failed:', err);
            res.status(500).json({ error: 'Failed to parse CSV file' });
        });
});

module.exports = router;
