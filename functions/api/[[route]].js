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
    if (!authHeader) return c.json({ error: '未授權' }, 401);
    
    let payload;
    try {
        const token = authHeader.replace('Bearer ', '').trim();
        const secret = c.env.JWT_SECRET || 'thisismysecretkey123456';
        payload = await verify(token, secret, 'HS256');
    } catch {
        return c.json({ error: 'Token 無效或過期' }, 401);
    }

    c.set('userId', payload.id || payload.userId);
    c.set('userEmail', payload.email);
    await next();
};

// ==========================================
// 1. Google OAuth 登入 & 舊帳號自動綁定
// ==========================================
app.post('/auth/google', async (c) => {
    try {
        const { credential } = await c.req.json();
        if (!credential) return c.json({ error: '缺少 Google 憑證' }, 400);

        const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        if (!resp.ok) return c.json({ error: 'Google 驗證無效' }, 400);
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

        const secret = c.env.JWT_SECRET || 'thisismysecretkey123456';
        const token = await sign({ id: userId, email }, secret, 'HS256');
        return c.json({ token, email, name, avatar });
    } catch (err) {
        return c.json({ error: '登入失敗: ' + err.message }, 500);
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

        return c.json({ success: true, message: '帳號及所有關聯資料已徹底刪除' });
    } catch (err) {
        return c.json({ error: '刪除帳號失敗: ' + err.message }, 500);
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

        return c.json({ expenses, categories: categoryList, budget });
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
        return c.json({ success: true });
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
        return c.json({ success: true });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

app.delete('/categories/:name', auth, async (c) => {
    try {
        const userId = c.get('userId');
        const name = decodeURIComponent(c.req.param('name'));
        await c.env.DB.prepare('DELETE FROM categories WHERE name = ? AND user_id = ?').bind(name, userId).run();
        return c.json({ success: true });
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

        return c.json({ userId, monthly, yearly, categoryLimits });
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

        return c.json({ _id: id, id, userId, title, amount, category, frequency, startDate, endDate, note });
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

        return c.json({ success: true });
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
        const body = await c.req.parseBody();
        const file = body['file'];

        if (!file || typeof file.text !== 'function') {
            return c.json({ error: '未上傳檔案或檔案格式錯誤' }, 400);
        }

        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
        if (lines.length < 2) return c.json({ error: 'CSV 檔案無內容' }, 400);

        const headerLine = lines[0].replace(/^\ufeff/, '');
        const headers = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

        const typeIdx = headers.indexOf('收支區分');
        const dateIdx = headers.indexOf('日期');
        const amountIdx = headers.indexOf('金額');
        const categoryIdx = headers.indexOf('類別');
        const noteIdx = headers.indexOf('備註');

        let skipCount = 0;
        const expensesToInsert = [];
        const categoriesFound = new Set();

        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',').map((col) => col.trim().replace(/^"|"$/g, ''));
            const type = typeIdx !== -1 ? row[typeIdx] : '';
            if (type && type !== '支') {
                skipCount++;
                continue;
            }

            let dateStr = dateIdx !== -1 ? (row[dateIdx] || '').trim() : '';
            if (dateStr.length === 8) {
                dateStr = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
            } else if (dateStr.includes('/')) {
                dateStr = dateStr.replace(/\//g, '-');
            } else if (!dateStr) {
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

        const db = c.env.DB;
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
            message: `匯入成功！新增了 ${expensesToInsert.length} 筆支出記錄 (略過 ${skipCount} 筆非支出項目)`,
        });
    } catch (err) {
        return c.json({ error: 'CSV 處理失敗: ' + err.message }, 500);
    }
});

// ==========================================
// 10. 使用者 ETF 投組與提領設定 (Cloudflare D1 雲端同步)
// ==========================================
app.get('/portfolio', auth, async (c) => {
    try {
        const userId = c.get('userId');
        const db = c.env.DB;
        await db.prepare(`
            CREATE TABLE IF NOT EXISTS user_portfolios (
                user_id TEXT PRIMARY KEY,
                settings_json TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `).run();

        const record = await db.prepare('SELECT settings_json FROM user_portfolios WHERE user_id = ?').bind(userId).first();
        if (!record) {
            return c.json({ exists: false, settings: null });
        }
        return c.json({ exists: true, settings: JSON.parse(record.settings_json) });
    } catch (err) {
        return c.json({ error: '讀取投組失敗: ' + err.message }, 500);
    }
});

app.post('/portfolio', auth, async (c) => {
    try {
        const userId = c.get('userId');
        const db = c.env.DB;
        const body = await c.req.json();
        const settingsJson = JSON.stringify(body);

        await db.prepare(`
            CREATE TABLE IF NOT EXISTS user_portfolios (
                user_id TEXT PRIMARY KEY,
                settings_json TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `).run();

        await db.prepare(`
            INSERT INTO user_portfolios (user_id, settings_json, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET
                settings_json = excluded.settings_json,
                updated_at = CURRENT_TIMESTAMP
        `).bind(userId, settingsJson).run();

        return c.json({ success: true, message: '投組設定已成功同步至 D1 資料庫' });
    } catch (err) {
        return c.json({ error: '儲存投組失敗: ' + err.message }, 500);
    }
});

// ==========================================
// 11. FinMind 股票與 ETF 邊緣快取代理端點
// ==========================================
const FINMIND_API = 'https://api.finmindtrade.com/api/v4/data';

const PRESET_STOCK_NAMES = {
    '0050': '元大台灣50',
    '0056': '元大高股息',
    '00878': '國泰永續高股息',
    '006208': '富邦台灣采吉50',
    '00713': '元大台灣高息低波',
    '00919': '群益台灣精選高息',
    '00929': '復華台灣科技優息',
    '00679B': '元大美債20年',
    '00687B': '國泰20年美債',
    '00720B': '元大投資級公司債',
    '00751B': '元大AAA至A公司債',
    '2330': '台積電',
    '2317': '鴻海',
    '2454': '聯發科',
    '現金': '現金 / 活存',
    'CASH': '現金 / 活存',
};

app.get('/stock/info', async (c) => {
    const stockId = (c.req.query('id') || c.req.query('stock_id') || '0050').toUpperCase().replace('.TW', '').trim();
    if (PRESET_STOCK_NAMES[stockId]) {
        return c.json({ stock_id: stockId, stock_name: PRESET_STOCK_NAMES[stockId] });
    }
    const token = c.env.FINMIND_TOKEN || '';
    try {
        const infoUrl = `${FINMIND_API}?dataset=TaiwanStockInfo&data_id=${encodeURIComponent(stockId)}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
        const res = await fetch(infoUrl);
        const json = await res.json();
        let stockName = stockId;
        let industry = '';
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            stockName = json.data[0].stock_name || stockId;
            industry = json.data[0].industry_category || '';
        }
        return c.json({ stock_id: stockId, stock_name: stockName, industry_category: industry });
    } catch {
        return c.json({ stock_id: stockId, stock_name: stockId });
    }
});

app.get('/stock/dividends', async (c) => {
    const stockId = (c.req.query('id') || c.req.query('stock_id') || '0050').toUpperCase().replace('.TW', '').trim();
    const token = c.env.FINMIND_TOKEN || '';
    try {
        const divUrl = `${FINMIND_API}?dataset=TaiwanStockDividendResult&data_id=${encodeURIComponent(stockId)}&start_date=2000-01-01${token ? `&token=${encodeURIComponent(token)}` : ''}`;
        const res = await fetch(divUrl);
        const json = await res.json();
        if (!json.data || !Array.isArray(json.data)) {
            return c.json({ stock_id: stockId, data: [] });
        }
        const records = json.data
            .map((d) => {
                const cashDiv = parseFloat(d.stock_and_cache_dividend) || 0;
                const beforePrice = parseFloat(d.before_price) || 0;
                const afterPrice = parseFloat(d.after_price) || 0;
                const yieldPct = beforePrice > 0 ? (cashDiv / beforePrice) * 100 : 0;
                const year = d.date ? parseInt(d.date.substring(0, 4), 10) : 0;
                return {
                    date: d.date,
                    year,
                    stock_id: d.stock_id,
                    cash_dividend: cashDiv,
                    before_price: beforePrice,
                    after_price: afterPrice,
                    yield_pct: Math.round(yieldPct * 100) / 100,
                };
            })
            .sort((a, b) => (a.date < b.date ? -1 : 1));
        return c.json({ stock_id: stockId, total_records: records.length, data: records });
    } catch (err) {
        return c.json({ error: '獲取股利失敗: ' + err.message }, 500);
    }
});

app.get('/stock/adjusted', async (c) => {
    const stockId = (c.req.query('id') || c.req.query('stock_id') || '0050').toUpperCase().replace('.TW', '').trim();
    const token = c.env.FINMIND_TOKEN || '';
    try {
        const priceUrl = `${FINMIND_API}?dataset=TaiwanStockPrice&data_id=${encodeURIComponent(stockId)}&start_date=2000-01-01${token ? `&token=${encodeURIComponent(token)}` : ''}`;
        const splitUrl = `${FINMIND_API}?dataset=TaiwanStockSplitPrice&data_id=${encodeURIComponent(stockId)}&start_date=2000-01-01${token ? `&token=${encodeURIComponent(token)}` : ''}`;
        const divUrl = `${FINMIND_API}?dataset=TaiwanStockDividendResult&data_id=${encodeURIComponent(stockId)}&start_date=2000-01-01${token ? `&token=${encodeURIComponent(token)}` : ''}`;

        const [priceRes, splitRes, divRes] = await Promise.all([fetch(priceUrl), fetch(splitUrl), fetch(divUrl)]);
        const [priceJson, splitJson, divJson] = await Promise.all([priceRes.json(), splitRes.json(), divRes.json()]);

        if (!priceJson.data || priceJson.data.length === 0) {
            return c.json({ error: `查無 ${stockId} 股價資料` }, 404);
        }

        const rawPrices = priceJson.data
            .map((item) => ({
                date: item.date,
                close: parseFloat(item.close) || 0,
            }))
            .filter((item) => item.close > 0)
            .sort((a, b) => (a.date < b.date ? -1 : 1));

        const events = [];
        if (splitJson.data && Array.isArray(splitJson.data)) {
            for (const s of splitJson.data) {
                if (s.before_price && s.after_price) {
                    events.push({
                        date: s.date,
                        before: parseFloat(s.before_price),
                        after: parseFloat(s.after_price),
                    });
                }
            }
        }
        if (divJson.data && Array.isArray(divJson.data)) {
            for (const d of divJson.data) {
                if (d.before_price && d.after_price) {
                    events.push({
                        date: d.date,
                        before: parseFloat(d.before_price),
                        after: parseFloat(d.after_price),
                    });
                }
            }
        }

        events.sort((a, b) => (a.date < b.date ? 1 : -1));
        const adjustedSeries = rawPrices.map((item) => ({ date: item.date, close: item.close }));

        for (const ev of events) {
            const ratio = ev.after / ev.before;
            if (ratio > 0 && isFinite(ratio)) {
                for (let i = 0; i < adjustedSeries.length; i++) {
                    if (adjustedSeries[i].date < ev.date) {
                        adjustedSeries[i].close *= ratio;
                    }
                }
            }
        }

        const finalSeries = adjustedSeries.map((item) => ({
            date: item.date,
            close: Math.round(item.close * 100) / 100,
        }));

        return c.json({
            stock_id: stockId,
            total_records: finalSeries.length,
            start_date: finalSeries[0]?.date || '',
            end_date: finalSeries[finalSeries.length - 1]?.date || '',
            data: finalSeries,
        });
    } catch (err) {
        return c.json({ error: '邊緣還原失敗: ' + err.message }, 500);
    }
});

export const onRequest = handle(app);
