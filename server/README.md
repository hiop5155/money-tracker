# Money Tracker - 舊版後端架構 (Legacy Express + MongoDB)

> **狀態**：⚠️ **已封存（Deprecated / 僅供歷史架構與規格參考）**  
> **線上環境已不再使用本目錄程式碼。**

---

## 說明

本專案現已全面遷移至 **Cloudflare Pages 全端無伺服器 (Serverless) 架構**：

- **線上後端 API**：已改由 [`functions/api/[[route]].js`](../functions/api/[[route]].js) 執行（基於 Cloudflare Pages Functions 與 Hono.js 輕量框架）。
- **線上資料庫**：已從 MongoDB 遷移至 **Cloudflare D1**（全球分散式邊緣 SQLite 資料庫）。
- **線上驗證**：已改為純 Google OAuth 快速登入，不再使用舊版的 Email 驗證信及密碼雜湊。
- **靜態資源與前端**：由 Cloudflare 全球 CDN 快取與提供服務。

---

## 本目錄保留之參考資產

此目錄保留供架構對照、規格查詢與歷史參考：

1. **[`openapi.yaml`](./openapi.yaml)**：
   - 完整的 OpenAPI 3.0 API 規格書，詳細定義了記帳、分類、定期交易與統計等端點之 Request / Response 格式。
2. **[`models/`](./models/)**：
   - 原 Mongoose 資料模型（`User.js`, `Expense.js`, `Category.js`, `RecurringExpense.js`），記錄原始欄位型別與業務邏輯驗證。
3. **[`routes/`](./routes/)**：
   - 原 Express API 路由實作（`auth.js`, `data.js`, `recurring.js`, `stocks.js`, `import.js`）。
4. **[`tests/`](./tests/)**：
   - 原後端 Jest 測試案例（`api.test.js`, `logic.test.js`）。

---

## 本地歷史除錯或測試（如需使用）

若未來需要於本地重新啟動舊版 Express 伺服器進行對比驗證：

```bash
# 1. 進入目錄並安裝依賴
cd server
npm install

# 2. 確認 .env 中的 MONGODB_URI 與 PORT
# 3. 啟動伺服器
npm start
```
