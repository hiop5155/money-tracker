import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify } from 'hono/jwt';
import { handle } from 'hono/cloudflare-pages';

const app = new Hono().basePath('/api');

// Enable CORS
app.use('*', cors());

// JWT Authentication Middleware
const auth = async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: '未授權', code: 'UNAUTHORIZED' }, 401);
    
    let payload;
    try {
        const token = authHeader.replace('Bearer ', '').trim();
        const secret = c.env.JWT_SECRET || 'thisismysecretkey123456';
        payload = await verify(token, secret, 'HS256');
    } catch {
        return c.json({ error: 'Token 無效或過期', code: 'INVALID_TOKEN' }, 401);
    }

    c.set('userId', payload.id || payload.userId);
    c.set('userEmail', payload.email);
    await next();
};

// ==========================================
// 會員方案與付費身份同步輔助函式
// 說明：絕不於程式碼中寫死任何特定用戶 Email，避免抓包洩漏。
// 僅從 Cloudflare 環境變數 PRO_ADMIN_EMAILS 同步資料庫記錄為合法付費會員。
// ==========================================
const ensureUserProStatus = async (db, env, userId, email) => {
    if (!db || !userId) return;
    const adminEmails = (env?.PRO_ADMIN_EMAILS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
    if (!adminEmails.length) return;

    const userEmail = (email || '').toLowerCase().trim();
    if (userEmail && adminEmails.includes(userEmail)) {
        try {
            await db.prepare(
                'UPDATE users SET plan_type = "pro_lifetime", plan_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND (plan_type IS NULL OR plan_type != "pro_lifetime")'
            ).bind(userId).run();
        } catch (e) {
            console.error('ensureUserProStatus error:', e);
        }
    }
};

const checkUserIsPro = (user) => {
    if (!user) return false;
    const planType = user.plan_type || 'free';
    if (planType === 'pro_lifetime' || planType === 'lifetime') return true;
    if (user.plan_expires_at) {
        return new Date(user.plan_expires_at) > new Date();
    }
    if (planType === 'pro' || planType.startsWith('pro_')) {
        return true;
    }
    return false;
};

// ==========================================
// 1. Google OAuth 登入 & 舊帳號自動綁定
// ==========================================
app.post('/auth/google', async (c) => {
    try {
        const { credential } = await c.req.json();
        if (!credential) return c.json({ error: '缺少 Google 憑證', code: 'MISSING_CREDENTIAL' }, 400);

        const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        if (!resp.ok) return c.json({ error: 'Google 驗證無效', code: 'INVALID_GOOGLE_AUTH' }, 400);
        const gUser = await resp.json();

        const db = c.env.DB;
        const email = (gUser.email || '').toLowerCase().trim();
        const googleId = gUser.sub;
        const name = gUser.name || email.split('@')[0];
        const avatar = gUser.picture || '';

        // 先檢查 email 或 google_id 是否已有用戶
        const existing = await db.prepare('SELECT * FROM users WHERE email = ? OR google_id = ?').bind(email, googleId).first();

        let userId;
        if (existing) {
            userId = existing.id;
            await db.prepare(
                'UPDATE users SET google_id = ?, name = COALESCE(NULLIF(?, ""), name), avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
            ).bind(googleId, name, avatar, userId).run();
        } else {
            userId = crypto.randomUUID();
            await db.prepare(
                'INSERT INTO users (id, google_id, email, name, avatar_url) VALUES (?, ?, ?, ?, ?)'
            ).bind(userId, googleId, email, name, avatar).run();
        }

        // 若為伺服器環境變數指定之特權帳號，確保 D1 資料庫紀錄為合法 pro_lifetime
        await ensureUserProStatus(db, c.env, userId, email);

        const secret = c.env.JWT_SECRET || 'thisismysecretkey123456';
        const token = await sign({ id: userId, email }, secret, 'HS256');
        return c.json({ token, email, name, avatar, code: 'LOGIN_SUCCESS' });
    } catch (err) {
        return c.json({ error: '登入失敗: ' + err.message, code: 'LOGIN_FAILED' }, 500);
    }
});

// ==========================================
// 1.1 刪除帳號 (/api/auth/delete)
// ==========================================
app.on(['PUT', 'DELETE'], '/auth/delete', auth, async (c) => {
    try {
        const userId = c.get('userId');
        const db = c.env.DB;

        // 原子性刪除該用戶的所有記帳、分類、預算、定期交易與帳號本身
        await db.batch([
            db.prepare('DELETE FROM expenses WHERE user_id = ?').bind(userId),
            db.prepare('DELETE FROM categories WHERE user_id = ?').bind(userId),
            db.prepare('DELETE FROM budgets WHERE user_id = ?').bind(userId),
            db.prepare('DELETE FROM recurring_expenses WHERE user_id = ?').bind(userId),
            db.prepare('DELETE FROM users WHERE id = ?').bind(userId),
        ]);

        return c.json({ success: true, code: 'ACCOUNT_DELETED', message: '帳號及所有關聯資料已徹底刪除' });
    } catch (err) {
        return c.json({ error: '刪除帳號失敗: ' + err.message, code: 'ACCOUNT_DELETE_FAILED' }, 500);
    }
});

// ==========================================
// 2. 主資料獲取 (/api/data)
// ==========================================
app.get('/data', auth, async (c) => {
    try {
        const userId = c.get('userId');
        const db = c.env.DB;

        // 1. 取得記帳記錄
        const { results: rawExpenses } = await db.prepare(
            'SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC, created_at DESC'
        ).bind(userId).all();

        const expenses = (rawExpenses || []).map((e) => ({
            id: e.id,
            _id: e.id,
            userId: e.user_id,
            date: e.date,
            category: e.category,
            amount: e.amount,
            type: e.type || 'expense',
            note: e.note || '',
            recurringId: e.recurring_id,
            createdAt: e.created_at,
        }));

        // 2. 取得分類
        const { results: rawCategories } = await db.prepare(
            'SELECT name FROM categories WHERE user_id = ?'
        ).bind(userId).all();

        let categoryList = (rawCategories || []).map((r) => r.name);
        if (categoryList.length === 0) {
            const defaults = ['早餐', '午餐', '晚餐', '飲料', '日用品', '娛樂', '稅金', '保險', '薪水', '交通'];
            const stmt = db.prepare('INSERT INTO categories (id, user_id, name) VALUES (?, ?, ?)');
            await db.batch(defaults.map((name) => stmt.bind(crypto.randomUUID(), userId, name)));
            categoryList = defaults;
        }

        // 3. 取得預算設定
        const budgetRow = await db.prepare('SELECT * FROM budgets WHERE user_id = ?').bind(userId).first();
        let budget;
        if (!budgetRow) {
            const defaultId = crypto.randomUUID();
            await db.prepare(
                'INSERT INTO budgets (id, user_id, monthly, yearly, category_limits) VALUES (?, ?, 10000, 120000, "[]")'
            ).bind(defaultId, userId).run();
            budget = { id: defaultId, userId, monthly: 10000, yearly: 120000, categoryLimits: [] };
        } else {
            let limits = [];
            try {
                limits = JSON.parse(budgetRow.category_limits || '[]');
            } catch {}
            budget = {
                id: budgetRow.id,
                userId: budgetRow.user_id,
                monthly: budgetRow.monthly,
                yearly: budgetRow.yearly,
                categoryLimits: limits,
            };
        }

        // 4. 取得用戶方案權限狀態
        let userPlan = 'free';
        let planExpiresAt = null;
        const userEmail = c.get('userEmail');
        try {
            await ensureUserProStatus(db, c.env, userId, userEmail);
            const userRow = await db.prepare('SELECT id, email, plan_type, plan_expires_at FROM users WHERE id = ?').bind(userId).first();
            userPlan = userRow?.plan_type || 'free';
            planExpiresAt = userRow?.plan_expires_at || null;

            // 檢查是否已過期 (非終身會員且有設定過期時間者)
            if (userPlan !== 'pro_lifetime' && userPlan !== 'lifetime' && planExpiresAt) {
                if (new Date(planExpiresAt) <= new Date()) {
                    userPlan = 'free';
                    planExpiresAt = null;
                    await db.prepare('UPDATE users SET plan_type = "free", plan_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(userId).run();
                }
            }
        } catch {
            userPlan = 'free';
        }

        return c.json({ expenses, categories: categoryList, budget, userPlan, planExpiresAt });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

// ==========================================
// 3. 記帳 CRUD (/api/expenses)
// ==========================================
app.post('/expenses', auth, async (c) => {
    try {
        const userId = c.get('userId');
        const body = await c.req.json();
        const id = crypto.randomUUID();
        const { category, amount, note, date, type, recurringId } = body;

        await c.env.DB.prepare(
            'INSERT INTO expenses (id, user_id, date, category, amount, type, note, recurring_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(id, userId, date, category, Number(amount || 0), type || 'expense', note || '', recurringId || null).run();

        return c.json({
            id,
            _id: id,
            userId,
            date,
            category,
            amount: Number(amount || 0),
            type: type || 'expense',
            note: note || '',
            recurringId: recurringId || null,
        });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

app.delete('/expenses/:id', auth, async (c) => {
    try {
        const userId = c.get('userId');
        const id = c.req.param('id');
        await c.env.DB.prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?').bind(id, userId).run();
        return c.json({ success: true, code: 'EXPENSE_DELETED' });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

app.put('/expenses/:id', auth, async (c) => {
    try {
        const userId = c.get('userId');
        const id = c.req.param('id');
        const { category, amount, note, date, type } = await c.req.json();

        await c.env.DB.prepare(
            'UPDATE expenses SET category = ?, amount = ?, note = ?, date = ?, type = ? WHERE id = ? AND user_id = ?'
        ).bind(category, Number(amount || 0), note || '', date, type || 'expense', id, userId).run();

        return c.json({
            id,
            _id: id,
            userId,
            category,
            amount: Number(amount || 0),
            note: note || '',
            date,
            type: type || 'expense',
            code: 'EXPENSE_UPDATED',
        });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

// ==========================================
// 4. 分類管理 (/api/categories)
// ==========================================
app.post('/categories', auth, async (c) => {
    try {
        const userId = c.get('userId');
        const { name } = await c.req.json();
        const id = crypto.randomUUID();
        await c.env.DB.prepare('INSERT INTO categories (id, user_id, name) VALUES (?, ?, ?)').bind(id, userId, name).run();
        return c.json({ success: true, code: 'CATEGORY_CREATED' });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

app.delete('/categories/:name', auth, async (c) => {
    try {
        const userId = c.get('userId');
        const name = decodeURIComponent(c.req.param('name'));
        await c.env.DB.prepare('DELETE FROM categories WHERE name = ? AND user_id = ?').bind(name, userId).run();
        return c.json({ success: true, code: 'CATEGORY_DELETED' });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

// ==========================================
// 5. 預算設定 (/api/budget)
// ==========================================
app.put('/budget', auth, async (c) => {
    try {
        const userId = c.get('userId');
        const { monthly, yearly, categoryLimits } = await c.req.json();
        const id = crypto.randomUUID();
        const limitsJson = JSON.stringify(categoryLimits || []);

        await c.env.DB.prepare(`
            INSERT INTO budgets (id, user_id, monthly, yearly, category_limits)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                monthly = excluded.monthly,
                yearly = excluded.yearly,
                category_limits = excluded.category_limits
        `).bind(id, userId, Number(monthly || 0), Number(yearly || 0), limitsJson).run();

        return c.json({ userId, monthly, yearly, categoryLimits, code: 'BUDGET_UPDATED' });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

// ==========================================
// 6. 週期性記帳 (/api/recurring)
// ==========================================
const generateDates = (start, end, freq) => {
    const dates = [];
    let current = new Date(start);
    const endDate = new Date(end);
    if (current > endDate) return dates;
    while (current <= endDate) {
        dates.push(new Date(current));
        if (freq === 'monthly') current.setMonth(current.getMonth() + 1);
        else if (freq === 'yearly') current.setFullYear(current.getFullYear() + 1);
        else break;
    }
    return dates;
};

app.get('/recurring', auth, async (c) => {
    try {
        const userId = c.get('userId');
        const { results } = await c.env.DB.prepare(
            'SELECT * FROM recurring_expenses WHERE user_id = ? ORDER BY created_at DESC'
        ).bind(userId).all();

        const list = (results || []).map((r) => ({
            _id: r.id,
            id: r.id,
            userId: r.user_id,
            title: r.title,
            amount: r.amount,
            category: r.category,
            frequency: r.frequency,
            startDate: r.start_date,
            endDate: r.end_date,
            note: r.note,
            type: r.type,
            createdAt: r.created_at,
        }));
        return c.json(list);
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

app.post('/recurring', auth, async (c) => {
    try {
        const userId = c.get('userId');
        const { title, amount, category, frequency, startDate, endDate, note } = await c.req.json();
        const id = crypto.randomUUID();

        await c.env.DB.prepare(
            'INSERT INTO recurring_expenses (id, user_id, title, amount, category, frequency, start_date, end_date, note, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(id, userId, title, Number(amount || 0), category, frequency, startDate, endDate, note || '', 'expense').run();

        const dates = generateDates(startDate, endDate, frequency);
        const insertStmt = c.env.DB.prepare(
            'INSERT INTO expenses (id, user_id, date, category, amount, note, recurring_id, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );

        const batch = dates.map((dateObj) =>
            insertStmt.bind(
                crypto.randomUUID(),
                userId,
                dateObj.toISOString().split('T')[0],
                category,
                Number(amount || 0),
                `(固定) ${note || title}`,
                id,
                'expense'
            )
        );

        if (batch.length > 0) {
            await c.env.DB.batch(batch);
        }

        return c.json({
            _id: id,
            id,
            userId,
            title,
            amount: Number(amount || 0),
            category,
            frequency,
            startDate,
            endDate,
            note,
        });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

app.put('/recurring/:id', auth, async (c) => {
    try {
        const userId = c.get('userId');
        const id = c.req.param('id');
        const { title, amount, category, frequency, startDate, endDate, note } = await c.req.json();

        await c.env.DB.prepare(
            'UPDATE recurring_expenses SET title = ?, amount = ?, category = ?, frequency = ?, start_date = ?, end_date = ?, note = ? WHERE id = ? AND user_id = ?'
        ).bind(title, Number(amount || 0), category, frequency, startDate, endDate, note || '', id, userId).run();

        // 刪除未來的關聯交易
        const now = new Date();
        const localDate = new Date(now.getTime() + 8 * 60 * 60 * 1000);
        const todayStr = localDate.toISOString().split('T')[0];

        await c.env.DB.prepare(
            'DELETE FROM expenses WHERE recurring_id = ? AND user_id = ? AND date > ?'
        ).bind(id, userId, todayStr).run();

        // 重新生成未來交易
        const dates = generateDates(startDate, endDate, frequency).filter((d) => d.toISOString().split('T')[0] > todayStr);
        const insertStmt = c.env.DB.prepare(
            'INSERT INTO expenses (id, user_id, date, category, amount, note, recurring_id, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );

        const batch = dates.map((dateObj) =>
            insertStmt.bind(
                crypto.randomUUID(),
                userId,
                dateObj.toISOString().split('T')[0],
                category,
                Number(amount || 0),
                `(固定) ${note || title}`,
                id,
                'expense'
            )
        );

        if (batch.length > 0) {
            await c.env.DB.batch(batch);
        }

        return c.json({ _id: id, id, userId, title, amount, category, frequency, startDate, endDate, note, code: 'RECURRING_CREATED' });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

app.delete('/recurring/:id', auth, async (c) => {
    try {
        const userId = c.get('userId');
        const id = c.req.param('id');

        await c.env.DB.prepare('DELETE FROM recurring_expenses WHERE id = ? AND user_id = ?').bind(id, userId).run();

        const now = new Date();
        const localDate = new Date(now.getTime() + 8 * 60 * 60 * 1000);
        const todayStr = localDate.toISOString().split('T')[0];

        await c.env.DB.prepare(
            'DELETE FROM expenses WHERE recurring_id = ? AND user_id = ? AND date > ?'
        ).bind(id, userId, todayStr).run();

        return c.json({ success: true, code: 'RECURRING_DELETED' });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

// ==========================================
// 7. 股票報價 (/api/stocks/price/:ticker)
// ==========================================
const SUFFIX_OVERRIDES = {
    '00937B': '.TWO',
    '00675L': '.TW',
    '00929': '.TW',
};

app.get('/stocks/price/:ticker', async (c) => {
    try {
        const cleanTicker = c.req.param('ticker').trim().toUpperCase();
        let suffix = '.TW';
        if (SUFFIX_OVERRIDES[cleanTicker]) {
            suffix = SUFFIX_OVERRIDES[cleanTicker];
        } else if (/^[A-Z]+$/.test(cleanTicker)) {
            suffix = '';
        }
        const yahooSymbol = cleanTicker + suffix;
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`;

        const resp = await fetch(url, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
        });

        if (!resp.ok) {
            return c.json({ error: `Yahoo Finance API error: ${resp.status}` }, resp.status);
        }

        const data = await resp.json();
        const result = data?.chart?.result?.[0];
        const price = result?.meta?.regularMarketPrice;

        if (price && price > 0) {
            return c.json({
                ticker: yahooSymbol,
                price: parseFloat(price.toFixed(2)),
                isEstimate: false,
                source: 'yahoo_finance',
                timestamp: new Date().toISOString(),
            });
        }

        return c.json({ error: 'Stock price not found', ticker: yahooSymbol }, 404);
    } catch (err) {
        return c.json({ error: 'Failed to fetch stock price', message: err.message }, 500);
    }
});

// ==========================================
// 8. CSV 匯入 (/api/import/csv)
// ==========================================
app.post('/import/csv', auth, async (c) => {
    try {
        const userId = c.get('userId');
        const db = c.env.DB;

        // 驗證 Pro 會員權限
        try {
            const user = await db.prepare('SELECT plan_type, plan_expires_at FROM users WHERE id = ?').bind(userId).first();
            const isPro = checkUserIsPro(user);
            if (!isPro) {
                return c.json({ error: 'UPGRADE_REQUIRED', code: 'UPGRADE_REQUIRED', message: 'CSV 資料匯入為 Pro 專業版專屬功能，請先升級解鎖。' }, 403);
            }
        } catch (checkErr) {
            console.error('Pro plan check exception:', checkErr);
        }

        const body = await c.req.parseBody();
        const file = body['file'];

        if (!file || typeof file.text !== 'function') {
            return c.json({ error: '未上傳檔案或檔案格式錯誤', code: 'INVALID_FILE' }, 400);
        }

        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
        if (lines.length < 2) return c.json({ error: 'CSV 檔案無內容', code: 'EMPTY_CSV' }, 400);

        const headerLine = lines[0].replace(/^\ufeff/, '');
        const headers = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

        const DATE_ALIASES = ['日期', 'date', '日付', '날짜'];
        const AMOUNT_ALIASES = ['金額', 'amount', '금액'];
        const CATEGORY_ALIASES = ['類別', '分類', 'category', 'カテゴリ', '카테고리'];
        const NOTE_ALIASES = ['備註', 'note', 'メモ', '메모', 'description'];
        const TYPE_ALIASES = ['收支區分', '類型', 'type', '収支区分', 'タイプ', '구분', '유형'];

        const EXPENSE_VALUES = new Set(['支', '支出', 'expense', 'expenditure', '지출']);
        const INCOME_VALUES = new Set(['收', '收入', 'income', 'revenue', '수입']);

        const findHeaderIndex = (aliases) => {
            return headers.findIndex((h) => {
                const clean = h.trim().toLowerCase();
                return aliases.some((a) => clean === a.toLowerCase());
            });
        };

        const typeIdx = findHeaderIndex(TYPE_ALIASES);
        const dateIdx = findHeaderIndex(DATE_ALIASES);
        const amountIdx = findHeaderIndex(AMOUNT_ALIASES);
        const categoryIdx = findHeaderIndex(CATEGORY_ALIASES);
        const noteIdx = findHeaderIndex(NOTE_ALIASES);

        let skipCount = 0;
        const expensesToInsert = [];
        const categoriesFound = new Set();

        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',').map((col) => col.trim().replace(/^"|"$/g, ''));
            const typeRaw = typeIdx !== -1 ? String(row[typeIdx] || '').trim().toLowerCase() : '';
            if (typeRaw && INCOME_VALUES.has(typeRaw) && !EXPENSE_VALUES.has(typeRaw)) {
                skipCount++;
                continue;
            }

            let dateStr = dateIdx !== -1 ? (row[dateIdx] || '').trim() : '';
            if (dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
                dateStr = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
            } else if (dateStr.includes('/')) {
                dateStr = dateStr.replace(/\//g, '-');
            } else if (!dateStr || isNaN(Date.parse(dateStr))) {
                skipCount++;
                continue;
            }

            const amountRaw = amountIdx !== -1 ? String(row[amountIdx] || '0').replace(/[^0-9.-]+/g, '') : '0';
            const amount = parseInt(amountRaw, 10);
            if (isNaN(amount) || amount <= 0) {
                skipCount++;
                continue;
            }

            const category = categoryIdx !== -1 && row[categoryIdx] ? row[categoryIdx] : '未分類';
            const note = noteIdx !== -1 && row[noteIdx] ? row[noteIdx] : '';

            categoriesFound.add(category);
            expensesToInsert.push({
                id: crypto.randomUUID(),
                userId,
                date: dateStr,
                category,
                amount,
                note,
                type: 'expense',
            });
        }

        // 分批寫入 (每批 50 筆)
        const chunkSize = 50;
        const stmt = db.prepare('INSERT INTO expenses (id, user_id, date, category, amount, type, note) VALUES (?, ?, ?, ?, ?, ?, ?)');
        for (let i = 0; i < expensesToInsert.length; i += chunkSize) {
            const chunk = expensesToInsert.slice(i, i + chunkSize);
            await db.batch(chunk.map((e) => stmt.bind(e.id, e.userId, e.date, e.category, e.amount, e.type, e.note)));
        }

        // 自動新增不存在的分類
        for (const catName of categoriesFound) {
            const exists = await db.prepare('SELECT id FROM categories WHERE user_id = ? AND name = ?').bind(userId, catName).first();
            if (!exists) {
                await db.prepare('INSERT INTO categories (id, user_id, name) VALUES (?, ?, ?)').bind(crypto.randomUUID(), userId, catName).run();
            }
        }

        return c.json({
            success: true,
            count: expensesToInsert.length,
            code: 'CSV_IMPORT_SUCCESS',
            message: `匯入成功！新增了 ${expensesToInsert.length} 筆支出記錄 (略過 ${skipCount} 筆非支出項目)`,
        });
    } catch (err) {
        return c.json({ error: 'CSV 處理失敗: ' + err.message, code: 'CSV_IMPORT_FAILED' }, 500);
    }
});
// ==========================================
// 9. Helio Web3 (USDT) 金流模組
// ==========================================

// 輔助函式：確保 D1 具有付費方案相關欄位與 orders 表
async function ensurePaymentSchema(db) {
    try {
        await db.prepare('ALTER TABLE users ADD COLUMN plan_type TEXT DEFAULT "free"').run();
    } catch {}
    try {
        await db.prepare('ALTER TABLE users ADD COLUMN plan_expires_at TIMESTAMP NULL').run();
    } catch {}
    try {
        await db.prepare('ALTER TABLE users ADD COLUMN helio_customer_id TEXT NULL').run();
    } catch {}
    try {
        await db.prepare(`
            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                order_type TEXT,
                amount REAL,
                currency TEXT DEFAULT 'USDT',
                status TEXT DEFAULT 'completed',
                helio_transaction_id TEXT,
                customer_email TEXT,
                customer_wallet TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `).run();
    } catch {}
}

// 9.1 查詢用戶當前付費狀態 (/api/payment/status)
app.get('/payment/status', auth, async (c) => {
    try {
        const userId = c.get('userId');
        const userEmail = c.get('userEmail');
        const db = c.env.DB;
        await ensurePaymentSchema(db);
        await ensureUserProStatus(db, c.env, userId, userEmail);

        let user = await db.prepare('SELECT id, email, plan_type, plan_expires_at, helio_customer_id FROM users WHERE id = ?').bind(userId).first();
        let planType = user?.plan_type || 'free';
        let planExpiresAt = user?.plan_expires_at || null;

        // 若非終身會員且有設定過期時間，檢查是否已過期
        if (planType !== 'pro_lifetime' && planType !== 'lifetime' && planExpiresAt) {
            if (new Date(planExpiresAt) <= new Date()) {
                planType = 'free';
                planExpiresAt = null;
                await db.prepare('UPDATE users SET plan_type = "free", plan_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(userId).run();
                user = { ...user, plan_type: 'free', plan_expires_at: null };
            }
        }

        const isPro = checkUserIsPro(user);

        return c.json({
            userId,
            email: user?.email || userEmail,
            isPro,
            planType: isPro ? planType : 'free',
            planExpiresAt,
            isAutoRenewing: Boolean(user?.helio_customer_id),
            code: 'PAYMENT_STATUS_SUCCESS',
        });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

// 9.1.1 測試模式：模擬切換方案狀態 (/api/payment/simulate-upgrade)
app.post('/payment/simulate-upgrade', auth, async (c) => {
    try {
        const userId = c.get('userId');
        const body = await c.req.json().catch(() => ({}));
        const planType = body.planType || 'pro_monthly';
        const db = c.env.DB;
        await ensurePaymentSchema(db);

        let expiresAt = null;
        let helioId = null;
        if (planType === 'pro_monthly') {
            const nextMonth = new Date();
            nextMonth.setDate(nextMonth.getDate() + 32);
            expiresAt = nextMonth.toISOString();
            helioId = 'sub_simulated_active';
        } else if (planType === 'pro_yearly') {
            const nextYear = new Date();
            nextYear.setDate(nextYear.getDate() + 370);
            expiresAt = nextYear.toISOString();
            helioId = 'sub_simulated_active';
        } else if (planType === 'pro_lifetime' || planType === 'free') {
            expiresAt = null;
            helioId = null;
        }

        await db.prepare(
            'UPDATE users SET plan_type = ?, plan_expires_at = ?, helio_customer_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).bind(planType, expiresAt, helioId, userId).run();

        return c.json({
            success: true,
            isPro: planType !== 'free',
            planType,
            planExpiresAt: expiresAt,
            message: planType === 'free' ? '已重設為免費版' : `已模擬解鎖 ${planType} 專業版方案`,
        });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

// 9.1.2 取消訂閱 (/api/payment/cancel - 聯動金流模組與資料庫)
app.post('/payment/cancel', auth, async (c) => {
    try {
        const userId = c.get('userId');
        const db = c.env.DB;
        await ensurePaymentSchema(db);

        // 1. 查詢用戶資訊與金流客戶標識 (helio_customer_id)
        const user = await db.prepare('SELECT id, email, plan_type, plan_expires_at, helio_customer_id FROM users WHERE id = ?').bind(userId).first();
        if (!user) return c.json({ error: '找不到用戶', code: 'USER_NOT_FOUND' }, 404);

        // 2. 聯動金流模組：呼叫 Helio API 終止定期扣款 (若環境變數配置了 HELIO_API_KEY)
        let helioCancelled = false;
        const helioApiKey = c.env.HELIO_API_KEY;
        if (helioApiKey && user.helio_customer_id) {
            try {
                const helioRes = await fetch(`https://api.helio.co/v1/subscriptions/${encodeURIComponent(user.helio_customer_id)}/cancel`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${helioApiKey}`,
                        'Content-Type': 'application/json',
                    },
                });
                if (helioRes.ok) {
                    helioCancelled = true;
                } else {
                    console.warn('Helio API cancel returned non-200:', await helioRes.text());
                }
            } catch (helioErr) {
                console.error('Failed to notify Helio payment provider:', helioErr);
            }
        }

        // 3. 聯動 orders 訂單表：將該用戶當前生效的訂單狀態更新為 cancelled
        await db.prepare(
            'UPDATE orders SET status = "cancelled" WHERE user_id = ? AND status = "completed"'
        ).bind(userId).run();

        // 4. 更新用戶資料表：終止定期扣款（清空 helio_customer_id），但【嚴格保留到期日 plan_expires_at】
        const expiresAt = user.plan_expires_at;
        const isStillValid = expiresAt ? new Date(expiresAt) > new Date() : false;
        const isLifetime = user.plan_type === 'pro_lifetime' || user.plan_type === 'lifetime';
        const isPro = isLifetime || isStillValid;
        const newPlanType = isPro ? user.plan_type : 'free';

        if (!isPro) {
            await db.prepare(
                'UPDATE users SET plan_type = "free", plan_expires_at = NULL, helio_customer_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
            ).bind(userId).run();
        } else {
            await db.prepare(
                'UPDATE users SET helio_customer_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
            ).bind(userId).run();
        }

        return c.json({
            success: true,
            isPro,
            planType: newPlanType,
            planExpiresAt: isPro ? expiresAt : null,
            isAutoRenewing: false,
            helioCancelled,
            code: isStillValid ? 'AUTO_RENEW_CANCELLED' : 'SUBSCRIPTION_CANCELLED',
            message: isStillValid
                ? '已成功終止下期自動扣款，您的專業版權限將持續有效至到期日。'
                : '已成功取消訂閱，金流定期扣款已終止，方案已重設為免費版。',
        });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

// 9.2 Helio 官方 Webhook 監聽器 (/api/payment/helio/webhook)
app.post('/payment/helio/webhook', async (c) => {
    try {
        const db = c.env.DB;
        await ensurePaymentSchema(db);

        // 1. 簽章安全驗證 (若環境變數有配置 HELIO_WEBHOOK_SECRET)
        const secret = c.env.HELIO_WEBHOOK_SECRET;
        if (secret) {
            const authHeader = c.req.header('Authorization') || c.req.header('helio-signature') || '';
            const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
            if (bearerToken !== secret && authHeader !== secret) {
                return c.json({ error: 'Invalid webhook signature', code: 'INVALID_WEBHOOK_SIGNATURE' }, 401);
            }
        }

        // 2. 解析 Helio Webhook Payload
        const payload = await c.req.json();
        const event = payload.event || payload.type || 'PAYMENT_COMPLETED';

        // 交易資料與客戶資訊萃取
        const transaction = payload.transaction || payload.data || payload;
        const customer = transaction.customer || payload.customer || {};
        const customMeta = transaction.customMeta || payload.customMeta || payload.meta || {};

        const targetUserId = customMeta.userId || customMeta.id;
        const targetEmail = (customer.email || customMeta.email || '').toLowerCase().trim();
        const customerWallet = customer.walletAddress || transaction.senderWallet || '';
        const amount = Number(transaction.amount || transaction.price || 0);
        const currency = transaction.currency || 'USDT';
        const txId = transaction.id || transaction.txId || crypto.randomUUID();

        // 若為金流端之取消訂閱事件
        if (event.includes('CANCEL') || event.includes('TERMINAT') || event === 'SUBSCRIPTION_CANCELLED') {
            await db.prepare(
                'UPDATE users SET plan_type = "free", plan_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? OR lower(email) = ?'
            ).bind(targetUserId || '', targetEmail || '').run();
            await db.prepare(
                'UPDATE orders SET status = "cancelled" WHERE (user_id = ? OR lower(customer_email) = ?) AND status = "completed"'
            ).bind(targetUserId || '', targetEmail || '').run();
            return c.json({ success: true, code: 'WEBHOOK_PROCESSED', message: 'Subscription cancellation processed' });
        }

        // 判斷購買型別：月訂閱 (60) / 年訂閱 (600) / 買斷 (1200)
        const selectedPlan = customMeta.plan || '';
        let planType = 'pro_monthly';
        let expiresAt = null;

        if (selectedPlan === 'yearly' || event.includes('YEARLY')) {
            planType = 'pro_yearly';
            const nextYear = new Date();
            nextYear.setDate(nextYear.getDate() + 370);
            expiresAt = nextYear.toISOString();
        } else if (selectedPlan === 'lifetime' || event.includes('LIFETIME')) {
            planType = 'pro_lifetime';
            expiresAt = null;
        } else {
            planType = 'pro_monthly';
            const nextMonth = new Date();
            nextMonth.setDate(nextMonth.getDate() + 32);
            expiresAt = nextMonth.toISOString();
        }

        // 3. 更新用戶資料表
        let updatedUser = null;
        if (targetUserId) {
            updatedUser = await db.prepare(
                'UPDATE users SET plan_type = ?, plan_expires_at = ?, helio_customer_id = COALESCE(?, helio_customer_id), updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING id'
            ).bind(planType, expiresAt, customerWallet, targetUserId).first();
        }

        // 若無 userId 則依據 email 比對
        if (!updatedUser && targetEmail) {
            updatedUser = await db.prepare(
                'UPDATE users SET plan_type = ?, plan_expires_at = ?, helio_customer_id = COALESCE(?, helio_customer_id), updated_at = CURRENT_TIMESTAMP WHERE email = ? RETURNING id'
            ).bind(planType, expiresAt, customerWallet, targetEmail).first();
        }

        // 4. 寫入訂單流水記錄
        await db.prepare(
            'INSERT INTO orders (id, user_id, order_type, amount, currency, status, helio_transaction_id, customer_email, customer_wallet) VALUES (?, ?, ?, ?, ?, "completed", ?, ?, ?)'
        ).bind(crypto.randomUUID(), updatedUser?.id || targetUserId || 'unknown', planType, amount, currency, txId, targetEmail, customerWallet).run();

        return c.json({
            success: true,
            code: 'WEBHOOK_PROCESSED',
            message: `Helio payment processed successfully`,
            planType,
        });
    } catch (err) {
        return c.json({ error: 'Webhook processing failed: ' + err.message, code: 'WEBHOOK_FAILED' }, 500);
    }
});

export const onRequest = handle(app);

