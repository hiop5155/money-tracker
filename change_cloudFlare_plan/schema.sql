-- =========================================================
-- Cloudflare D1 Schema for Money Tracker
-- =========================================================

-- 1. 使用者表 (支援舊用戶與 Google OAuth 自動綁定)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,                   -- 保持原 MongoDB _id (Hex 字串) 或 UUID
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
    id TEXT PRIMARY KEY,                   -- 原 MongoDB _id 或 UUID
    user_id TEXT NOT NULL,                 -- 關聯 users.id
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);

-- 3. 記帳交易記錄表
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,                   -- 原 MongoDB _id 或 UUID
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
    id TEXT PRIMARY KEY,                   -- 原 MongoDB _id 或 UUID
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
    id TEXT PRIMARY KEY,                   -- 原 MongoDB _id 或 UUID
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
