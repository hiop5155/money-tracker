const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const auth = require('../middleware/auth');
const Expense = require('../models/Expense');
const Category = require('../models/Category');
const User = require('../models/User');
const { isUserPro } = require('../utils/planHelper');

const os = require('os');
const path = require('path');

// Setup Multer (Temporary storage in /tmp for Serverless compatibility)
const upload = multer({ dest: path.join(os.tmpdir(), 'uploads') });

// 多語言欄位別名定義（向下相容天天記帳與本系統多語言匯出）
const DATE_ALIASES = ['日期', 'date', '日付', '날짜'];
const AMOUNT_ALIASES = ['金額', 'amount', '금액'];
const CATEGORY_ALIASES = ['類別', '分類', 'category', 'カテゴリ', '카테고리'];
const NOTE_ALIASES = ['備註', 'note', 'メモ', '메모', 'description'];
const TYPE_ALIASES = ['收支區分', '類型', 'type', '収支区分', 'タイプ', '구분', '유형'];

const EXPENSE_VALUES = new Set(['支', '支出', 'expense', 'expenditure', '지출']);
const INCOME_VALUES = new Set(['收', '收入', 'income', 'revenue', '수입']);

const getRowValue = (row, aliases) => {
    for (const key of Object.keys(row)) {
        const clean = key.trim().toLowerCase();
        if (aliases.some((a) => clean === a.toLowerCase())) {
            return row[key];
        }
    }
    return undefined;
};

router.post('/csv', auth, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded', code: 'INVALID_FILE' });
    }

    const userId = req.user.id;
    try {
        const user = await User.findById(userId);
        const isPro = isUserPro(user);
        if (!isPro) {
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(403).json({ error: 'UPGRADE_REQUIRED', code: 'UPGRADE_REQUIRED', message: 'CSV 資料匯入為 Pro 專業版專屬功能，請先升級解鎖。' });
        }
    } catch (e) {
        console.error('Plan check error:', e);
    }

    const results = [];
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
            // 1. Filtering Logic: Only import "Expenditure" (支出)
            const rawType = String(getRowValue(data, TYPE_ALIASES) || '').trim().toLowerCase();
            if (rawType && INCOME_VALUES.has(rawType) && !EXPENSE_VALUES.has(rawType)) {
                skipCount++;
                return;
            }

            // 2. Date Conversion: 20260108 -> 2026-01-08
            let dateStr = String(getRowValue(data, DATE_ALIASES) || '').trim();

            if (dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
                // Format 20260108
                dateStr = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
            } else if (dateStr.includes('/')) {
                // Format 2026/01/08
                dateStr = dateStr.replace(/\//g, '-');
            } else if (!dateStr || isNaN(Date.parse(dateStr))) {
                console.warn('Skipping invalid date:', data);
                skipCount++;
                return;
            }

            // 3. Amount Processing (Remove commas or non-numeric characters)
            let amountRaw = String(getRowValue(data, AMOUNT_ALIASES) || '0').replace(/[^0-9.-]+/g, '');
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
                category: getRowValue(data, CATEGORY_ALIASES) || 'Uncategorized',
                amount: amount,
                note: getRowValue(data, NOTE_ALIASES) || '',
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
                    code: 'CSV_IMPORT_SUCCESS',
                    message: `Import successful! Added ${results.length} expenses (Skipped ${skipCount} non-expense items)`,
                });
            } catch (err) {
                console.error('Database write failed:', err);
                res.status(500).json({ error: 'Database error during import', code: 'CSV_IMPORT_FAILED' });
            }
        })
        .on('error', (err) => {
            console.error('CSV Parse Failed:', err);
            res.status(500).json({ error: 'Failed to parse CSV file', code: 'CSV_PARSE_FAILED' });
        });
});

module.exports = router;
