/**
 * migrate-mongo-to-d1.js
 * 
 * 作用：自 MongoDB 導出資料並轉為 Cloudflare D1 相容的 SQLite INSERT 語句 (migration_data.sql)
 * 執行方式：node migrate-mongo-to-d1.js
 */

const fs = require('fs');
const path = require('path');

// 從 server/node_modules 載入套件
const resolveServerModule = (name) => {
    try {
        return require(name);
    } catch {
        return require(path.join(__dirname, '../server/node_modules', name));
    }
};

const mongoose = resolveServerModule('mongoose');
const dotenv = resolveServerModule('dotenv');

// 載入 .env 設定
const envPath = path.join(__dirname, '../server/.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    dotenv.config();
}

const escapeSql = (val) => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return val;
    return `'${String(val).replace(/'/g, "''")}'`;
};

async function migrate() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('錯誤: 未在 .env 找到 MONGODB_URI');
        process.exit(1);
    }

    console.log('1. 正在連線至 MongoDB:', mongoUri.replace(/\/\/.*@/, '//***:***@'));
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
    console.log('   連線成功！');

    let db = mongoose.connection.db;
    
    // 掃描 cluster 上的所有資料庫以尋找真正的記帳資料
    let candidateDbs = [db.databaseName, 'test', 'budget', 'moneytracker', 'money-tracker', 'money_tracker'];
    try {
        const admin = mongoose.connection.client.db().admin();
        const dbsInfo = await admin.listDatabases();
        if (dbsInfo && dbsInfo.databases) {
            candidateDbs = [...new Set([...candidateDbs, ...dbsInfo.databases.map(d => d.name)])];
        }
    } catch {
        console.log('   無法由 admin 列舉資料庫，直接掃描常見資料庫名稱...');
    }

    let foundTargetDb = false;
    for (const dbName of candidateDbs) {
        if (!dbName || ['admin', 'local', 'config'].includes(dbName)) continue;
        const testDb = mongoose.connection.client.db(dbName);
        const cols = await testDb.listCollections().toArray();
        const colNames = cols.map(c => c.name);
        console.log(`   檢查資料庫 [${dbName}]: 集合 ->`, colNames);
        if (colNames.some(c => ['users', 'expenses', 'categories', 'budgets'].includes(c.toLowerCase()))) {
            db = testDb;
            foundTargetDb = true;
            console.log(`   => 成功找到資料！切換至資料庫 [${dbName}]`);
            break;
        }
    }

    if (!foundTargetDb) {
        console.warn(`   ⚠️ 警告：未在任何資料庫中找到 users/expenses 集合，將使用 [${db.databaseName}]`);
    }

    const sqlStatements = [
        '-- =========================================================',
        '-- Cloudflare D1 Migration SQL Dump',
        `-- Generated at: ${new Date().toISOString()}`,
        '-- =========================================================',
        'PRAGMA foreign_keys = OFF;'
    ];

    // 1. Users
    const users = await db.collection('users').find({}).toArray();
    console.log(`2. 導出 Users: 共 ${users.length} 筆`);
    for (const u of users) {
        const id = escapeSql(u._id.toString());
        const email = escapeSql(u.email);
        const name = escapeSql((u.email || '').split('@')[0]);
        const createdAt = u._id.getTimestamp ? escapeSql(u._id.getTimestamp().toISOString()) : escapeSql(new Date().toISOString());
        sqlStatements.push(`INSERT OR REPLACE INTO users (id, email, name, created_at) VALUES (${id}, ${email}, ${name}, ${createdAt});`);
    }

    // 2. Categories
    const categories = await db.collection('categories').find({}).toArray();
    console.log(`3. 導出 Categories: 共 ${categories.length} 筆`);
    for (const c of categories) {
        const id = escapeSql(c._id.toString());
        const userId = escapeSql(c.userId.toString());
        const name = escapeSql(c.name);
        sqlStatements.push(`INSERT OR REPLACE INTO categories (id, user_id, name) VALUES (${id}, ${userId}, ${name});`);
    }

    // 3. Expenses
    const expenses = await db.collection('expenses').find({}).toArray();
    console.log(`4. 導出 Expenses: 共 ${expenses.length} 筆`);
    for (const e of expenses) {
        const id = escapeSql(e._id.toString());
        const userId = escapeSql(e.userId.toString());
        const date = escapeSql(e.date);
        const category = escapeSql(e.category);
        const amount = Number(e.amount || 0);
        const type = escapeSql(e.type || 'expense');
        const note = escapeSql(e.note || '');
        const recurringId = e.recurringId ? escapeSql(e.recurringId.toString()) : 'NULL';
        const createdAt = e.createdAt ? escapeSql(new Date(e.createdAt).toISOString()) : escapeSql(new Date().toISOString());
        sqlStatements.push(`INSERT OR REPLACE INTO expenses (id, user_id, date, category, amount, type, note, recurring_id, created_at) VALUES (${id}, ${userId}, ${date}, ${category}, ${amount}, ${type}, ${note}, ${recurringId}, ${createdAt});`);
    }

    // 4. Budgets
    const budgets = await db.collection('budgets').find({}).toArray();
    console.log(`5. 導出 Budgets: 共 ${budgets.length} 筆`);
    for (const b of budgets) {
        const id = escapeSql(b._id.toString());
        const userId = escapeSql(b.userId.toString());
        const monthly = Number(b.monthly || 0);
        const yearly = Number(b.yearly || 0);
        const categoryLimits = escapeSql(JSON.stringify(b.categoryLimits || []));
        sqlStatements.push(`INSERT OR REPLACE INTO budgets (id, user_id, monthly, yearly, category_limits) VALUES (${id}, ${userId}, ${monthly}, ${yearly}, ${categoryLimits});`);
    }

    // 5. RecurringExpenses
    const recurring = await db.collection('recurringexpenses').find({}).toArray();
    console.log(`6. 導出 RecurringExpenses: 共 ${recurring.length} 筆`);
    for (const r of recurring) {
        const id = escapeSql(r._id.toString());
        const userId = escapeSql(r.userId.toString());
        const title = escapeSql(r.title);
        const amount = Number(r.amount || 0);
        const category = escapeSql(r.category);
        const frequency = escapeSql(r.frequency || 'monthly');
        const startDate = r.startDate ? escapeSql(new Date(r.startDate).toISOString().slice(0, 10)) : escapeSql(new Date().toISOString().slice(0, 10));
        const endDate = r.endDate ? escapeSql(new Date(r.endDate).toISOString().slice(0, 10)) : escapeSql(new Date().toISOString().slice(0, 10));
        const note = escapeSql(r.note || '');
        const type = escapeSql(r.type || 'expense');
        sqlStatements.push(`INSERT OR REPLACE INTO recurring_expenses (id, user_id, title, amount, category, frequency, start_date, end_date, note, type) VALUES (${id}, ${userId}, ${title}, ${amount}, ${category}, ${frequency}, ${startDate}, ${endDate}, ${note}, ${type});`);
    }

    sqlStatements.push('PRAGMA foreign_keys = ON;');

    const outputPath = path.join(__dirname, 'migration_data.sql');
    fs.writeFileSync(outputPath, sqlStatements.join('\n'), 'utf8');

    console.log(`\n======================================================`);
    console.log(`成功匯出 SQL 遷移檔: ${outputPath}`);
    console.log(`總計產生語句數: ${sqlStatements.length}`);
    console.log(`======================================================\n`);

    await mongoose.disconnect();
    process.exit(0);
}

migrate().catch(err => {
    console.error('遷移出錯:', err);
    process.exit(1);
});
