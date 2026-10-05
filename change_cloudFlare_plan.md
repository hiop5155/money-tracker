# Money Tracker 全面轉移至 Cloudflare 生態系實作計畫 (含 MongoDB ➔ D1 數據遷移)

---

## 1. 核心目標與架構變更對比

本計畫將 `money-tracker` 從現行的 **Vercel + Express + MongoDB Atlas + Nodemailer** 完整遷移為 **100% Cloudflare 邊緣無伺服器架構**：

| 架構層級 | 現行方案 (Vercel) | 新架構 (Cloudflare) | 升級優勢 |
| :--- | :--- | :--- | :--- |
| **前端託管** | Vercel (每月 100GB 限制) | **Cloudflare Pages** | **無限免費頻寬**、台灣 Anycast 節點直連 (<10ms) |
| **後端 API** | Express.js on Node.js Serverless | **Hono on Cloudflare Workers / Functions** | **0 冷啟動**、毫秒級邊緣回應、零維護成本 |
| **資料庫** | MongoDB Atlas M0 (512MB 限制) | **Cloudflare D1 (5GB SQLite)** | **10 倍免費容量**、標準 SQL 加總統計神速、無連線池限制 |
| **身分驗證** | JWT + Nodemailer SMTP (Email OTP) | **Google OAuth 2.0 (Google 登入)** | **徹底刪除 Nodemailer/密碼儲存/OTP 驗證**，註冊即實名 |

---

## 2. 現有 MongoDB 數據結構分析 (基於 `server/models`)

經深入分析現行 `server/models/` 原始碼，既有資料結構如下：

1. **`User` (使用者)**：
   * 欄位：`_id`, `email`, `password`, `isVerified`, `verificationToken`, `resetPasswordToken` 等。
2. **`Category` (收支分類)**：
   * 欄位：`_id`, `userId` (Ref: User), `name`。
3. **`Expense` (交易明細)**：
   * 欄位：`_id`, `userId`, `date` (字串 YYYY-MM-DD), `category` (注意：原設計存的是分類**名稱字串**，非 ID), `amount`, `note`, `type` ('expense'/'income'), `recurringId`, `createdAt`。
4. **`Budget` (預算設定)**：
   * 欄位：`_id`, `userId`, `monthly`, `yearly`, `categoryLimits` (巢狀陣列: `[{ name, monthly, yearly }]`)。
5. **`RecurringExpense` (週期記帳範本)**：
   * 欄位：`_id`, `userId`, `title`, `amount`, `category`, `frequency`, `startDate`, `endDate`, `note`, `type`, `createdAt`。

---

## 3. Cloudflare D1 資料表設計 (`schema.sql`)

針對上述資料結構進行 SQLite 最佳化，保持與現有前端資料相容：

```sql
-- 1. 使用者表 (支援舊用戶與 Google OAuth 自動綁定)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,                   -- 保持原 MongoDB _id (Hex 字串)
    google_id TEXT UNIQUE,                 -- Google Sub ID (首次 Google 登入時填入)
    email TEXT UNIQUE NOT NULL,            -- Email (唯一識別)
    name TEXT DEFAULT '',                  -- 使用者姓名
    avatar_url TEXT DEFAULT '',            -- Google 頭像網址
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- 2. 分類表
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,                   -- 原 MongoDB _id
    user_id TEXT NOT NULL,                 -- 關聯 users.id
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);

-- 3. 記帳交易記錄表
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,                   -- 原 MongoDB _id
    user_id TEXT NOT NULL,                 -- 關聯 users.id
    date TEXT NOT NULL,                    -- 格式: YYYY-MM-DD
    category TEXT NOT NULL,                -- 分類名稱 (相容原架構)
    amount REAL NOT NULL,
    type TEXT CHECK(type IN ('income', 'expense')) DEFAULT 'expense',
    note TEXT DEFAULT '',
    recurring_id TEXT DEFAULT NULL,        -- 關聯 recurring_expenses.id
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_cat ON expenses(user_id, category);

-- 4. 預算設定表
CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,                   -- 原 MongoDB _id
    user_id TEXT UNIQUE NOT NULL,          -- 每個使用者一筆預算設定
    monthly REAL DEFAULT 0,
    yearly REAL DEFAULT 0,
    category_limits TEXT DEFAULT '[]',     -- 序列化 JSON 存儲 categoryLimits 陣列
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);

-- 5. 週期性記帳範本
CREATE TABLE IF NOT EXISTS recurring_expenses (
    id TEXT PRIMARY KEY,                   -- 原 MongoDB _id
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    frequency TEXT CHECK(frequency IN ('monthly', 'yearly')) NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    note TEXT DEFAULT '',
    type TEXT CHECK(type IN ('income', 'expense')) DEFAULT 'expense',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_expenses(user_id);
```

---

## 4. MongoDB ➔ Cloudflare D1 遷移計畫與腳本

### 4.1 舊資料與 Google OAuth 平滑銜接機制
* **免除手動匯入密碼**：舊資料匯入 D1 時，保留原有的 `id` (`_id.toString()`) 與 `email`。
* **首次登入自動合併帳號 (Account Linking)**：
  當使用者使用 Google 登入時：
  1. 後端以 Google 回傳的 `email` 查詢 D1 的 `users` 表。
  2. 若 `email` 已存在（舊用戶）：執行 `UPDATE users SET google_id = ?, name = ?, avatar_url = ? WHERE email = ?`。
  3. **成果**：使用者只需點選 Google 登入，原本在 MongoDB 的所有歷史記帳資料、分類、預算**100% 完整無縫呈現**！

---

### 4.2 資料庫匯出與轉移腳本 (`migrate-mongo-to-d1.js`)

專案提供自動遷移工具，從 `server/.env` 自動連線 MongoDB，將所有 Collections 轉為 SQLite 相容的 `migration_data.sql`：

```javascript
/**
 * scripts/migrate-mongo-to-d1.js
 * 執行指令: node scripts/migrate-mongo-to-d1.js
 */
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const escapeSql = (str) => {
    if (str === null || str === undefined) return 'NULL';
    if (typeof str === 'number') return str;
    return `'${String(str).replace(/'/g, "''")}'`;
};

async function migrate() {
    const mongoUri = process.env.MONGODB_URI;
    console.log('連線至 MongoDB:', mongoUri.replace(/\/\/.*@/, '//<CREDENTIALS>@'));
    await mongoose.connect(mongoUri);

    const db = mongoose.connection.db;
    const sqlStatements = [
        '-- Auto-generated MongoDB to Cloudflare D1 migration dump',
        'PRAGMA foreign_keys = OFF;',
        'BEGIN TRANSACTION;'
    ];

    // 1. Users
    const users = await db.collection('users').find({}).toArray();
    console.log(`正在轉移 Users (${users.length} 筆)...`);
    for (const u of users) {
        sqlStatements.push(`INSERT OR REPLACE INTO users (id, email, name, created_at) VALUES (${escapeSql(u._id.toString())}, ${escapeSql(u.email)}, ${escapeSql(u.email.split('@')[0])}, ${escapeSql(u._id.getTimestamp().toISOString())});`);
    }

    // 2. Categories
    const categories = await db.collection('categories').find({}).toArray();
    console.log(`正在轉移 Categories (${categories.length} 筆)...`);
    for (const c of categories) {
        sqlStatements.push(`INSERT OR REPLACE INTO categories (id, user_id, name) VALUES (${escapeSql(c._id.toString())}, ${escapeSql(c.userId.toString())}, ${escapeSql(c.name)});`);
    }

    // 3. Expenses
    const expenses = await db.collection('expenses').find({}).toArray();
    console.log(`正在轉移 Expenses (${expenses.length} 筆)...`);
    for (const e of expenses) {
        const recurringId = e.recurringId ? escapeSql(e.recurringId.toString()) : 'NULL';
        const createdAt = e.createdAt ? escapeSql(new Date(e.createdAt).toISOString()) : escapeSql(new Date().toISOString());
        sqlStatements.push(`INSERT OR REPLACE INTO expenses (id, user_id, date, category, amount, type, note, recurring_id, created_at) VALUES (${escapeSql(e._id.toString())}, ${escapeSql(e.userId.toString())}, ${escapeSql(e.date)}, ${escapeSql(e.category)}, ${Number(e.amount)}, ${escapeSql(e.type || 'expense')}, ${escapeSql(e.note || '')}, ${recurringId}, ${createdAt});`);
    }

    // 4. Budgets
    const budgets = await db.collection('budgets').find({}).toArray();
    console.log(`正在轉移 Budgets (${budgets.length} 筆)...`);
    for (const b of budgets) {
        const categoryLimits = JSON.stringify(b.categoryLimits || []);
        sqlStatements.push(`INSERT OR REPLACE INTO budgets (id, user_id, monthly, yearly, category_limits) VALUES (${escapeSql(b._id.toString())}, ${escapeSql(b.userId.toString())}, ${Number(b.monthly || 0)}, ${Number(b.yearly || 0)}, ${escapeSql(categoryLimits)});`);
    }

    // 5. RecurringExpenses
    const recurring = await db.collection('recurringexpenses').find({}).toArray();
    console.log(`正在轉移 RecurringExpenses (${recurring.length} 筆)...`);
    for (const r of recurring) {
        const startDate = r.startDate ? escapeSql(new Date(r.startDate).toISOString().slice(0, 10)) : escapeSql(new Date().toISOString().slice(0, 10));
        const endDate = r.endDate ? escapeSql(new Date(r.endDate).toISOString().slice(0, 10)) : escapeSql(new Date().toISOString().slice(0, 10));
        sqlStatements.push(`INSERT OR REPLACE INTO recurring_expenses (id, user_id, title, amount, category, frequency, start_date, end_date, note, type) VALUES (${escapeSql(r._id.toString())}, ${escapeSql(r.userId.toString())}, ${escapeSql(r.title)}, ${Number(r.amount)}, ${escapeSql(r.category)}, ${escapeSql(r.frequency)}, ${startDate}, ${endDate}, ${escapeSql(r.note || '')}, ${escapeSql(r.type || 'expense')});`);
    }

    sqlStatements.push('COMMIT;');
    sqlStatements.push('PRAGMA foreign_keys = ON;');

    const outputPath = path.join(__dirname, 'migration_data.sql');
    fs.writeFileSync(outputPath, sqlStatements.join('\n'), 'utf8');
    console.log(`遷移 SQL 檔案產出成功: ${outputPath} (${sqlStatements.length} 條語句)`);
    await mongoose.disconnect();
}

migrate().catch(console.error);
```

---

### 4.3 載入 Cloudflare D1 實施指令

1. **建立 Cloudflare D1 實例**：
   ```bash
   npx wrangler d1 create money-tracker-db
   ```
2. **初始化資料表結構**：
   ```bash
   npx wrangler d1 execute money-tracker-db --file=./schema.sql
   ```
3. **執行遷移腳本產生數據**：
   ```bash
   node scripts/migrate-mongo-to-d1.js
   ```
4. **將資料載入雲端正式 D1**：
   ```bash
   npx wrangler d1 execute money-tracker-db --file=./migration_data.sql
   ```

---

## 5. 後端 Hono API 改寫 (Pages Functions / Workers)

後端採用 **Hono 框架**，在邊緣直接調用 D1 Binding：

```javascript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify } from 'hono/jwt';

const app = new Hono().basePath('/api');
app.use('*', cors());

// JWT 中介層
const auth = async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: '未授權' }, 401);
    try {
        const token = authHeader.replace('Bearer ', '');
        const payload = await verify(token, c.env.JWT_SECRET);
        c.set('userId', payload.userId);
        await next();
    } catch {
        return c.json({ error: 'Token 無效或過期' }, 401);
    }
};

// 1. Google 登入 / 自動綁定舊資料
app.post('/auth/google', async (c) => {
    const { credential } = await c.req.json();
    // 呼叫 Google Tokeninfo 驗證
    const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!resp.ok) return c.json({ error: 'Google 驗證無效' }, 400);
    const gUser = await resp.json();

    const db = c.env.DB;
    // 檢查舊帳號是否已存在 (根據 Email)
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(gUser.email).first();

    let userId;
    if (existing) {
        userId = existing.id;
        // 更新 Google ID 與個人資訊
        await db.prepare('UPDATE users SET google_id = ?, name = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .bind(gUser.sub, gUser.name, gUser.picture, userId).run();
    } else {
        userId = crypto.randomUUID();
        // 新增使用者
        await db.prepare('INSERT INTO users (id, google_id, email, name, avatar_url) VALUES (?, ?, ?, ?, ?)')
            .bind(userId, gUser.sub, gUser.email, gUser.name, gUser.picture).run();
    }

    const token = await sign({ userId }, c.env.JWT_SECRET);
    return c.json({ token, user: { id: userId, email: gUser.email, name: gUser.name, avatar: gUser.picture } });
});

// 2. 獲取收支記錄
app.get('/expenses', auth, async (c) => {
    const userId = c.get('userId');
    const { startDate, endDate } = c.req.query();
    
    let query = 'SELECT * FROM expenses WHERE user_id = ?';
    const params = [userId];
    if (startDate && endDate) {
        query += ' AND date BETWEEN ? AND ? ORDER BY date DESC, created_at DESC';
        params.push(startDate, endDate);
    } else {
        query += ' ORDER BY date DESC, created_at DESC';
    }

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json(results);
});

// 3. 新增收支記錄
app.post('/expenses', auth, async (c) => {
    const userId = c.get('userId');
    const { date, category, amount, note, type } = await c.req.json();
    const id = crypto.randomUUID();

    await c.env.DB.prepare(
        'INSERT INTO expenses (id, user_id, date, category, amount, note, type) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, userId, date, category, Number(amount), note || '', type || 'expense').run();

    return c.json({ id, userId, date, category, amount, note, type }, 201);
});

export default app;
```

---

## 6. 前端改動清單 (Client)

1. **安裝 Google OAuth 元件**：
   ```bash
   npm install @react-oauth/google
   ```
2. **替換登入入口 (`client/src/main.jsx`)**：
   ```jsx
   import { GoogleOAuthProvider } from '@react-oauth/google';
   
   ReactDOM.createRoot(document.getElementById('root')).render(
     <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
       <App />
     </GoogleOAuthProvider>
   );
   ```
3. **登入頁面整合**：
   在登入頁面以官方 `<GoogleLogin />` 元件取代舊有的 Email / Password / 註冊表單，授權成功後直接呼叫 `/api/auth/google`。
4. **拔除舊邏輯**：
   徹底刪除 OTP 輸入框、信箱驗證提示、重設密碼頁面。

---

## 7. 遷移檢查驗證清單 (Verification Checklist)

* [ ] **數據完整性**：比對 MongoDB 筆數與 D1 匯入筆數 (`SELECT count(*) FROM expenses`) 完全一致。
* [ ] **外鍵關聯**：所有 `expenses.user_id` 皆能在 `users.id` 找到對應，沒有孤兒交易記錄。
* [ ] **平滑登入**：以既有測試 Email 的 Google 帳號登入，確認登入後能直接看到舊有的收支紀錄。
* [ ] **預算統計**：確認 D1 讀取的 `category_limits` JSON 格式能在前端正常渲染圖表。
