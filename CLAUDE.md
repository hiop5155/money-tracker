# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Money Tracker is a full-stack personal finance app. Frontend: React 19 + Vite + Tailwind CSS v4. Backend: Node.js + Express.js v5 + MongoDB (Mongoose). UI language is Traditional Chinese (zh-TW).

## Commands

### Backend (from `server/`)
```bash
npm start          # Start server on port 5001
npm test           # Run Jest + Supertest integration tests
npm run format     # Prettier formatting
```

### Frontend (from `client/`)
```bash
npm run dev        # Start Vite dev server on port 5173
npm run build      # Production build to dist/
npm test           # Run Vitest + React Testing Library tests
npm run format     # Prettier formatting
```

### Root
```bash
npm run format     # Format entire project
```

## Environment Setup

**`server/.env`:**
```
PORT=5001
MONGODB_URI=mongodb://127.0.0.1:27017/money_tracker
JWT_SECRET=thisismysecretkey123456
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
NODE_ENV=test        # Set for test runs
```

**`client/.env`** (optional):
```
VITE_API_URL=http://localhost:5001/api
```

The Vite dev server proxies all `/api` requests to `http://localhost:5001` automatically.

## Architecture

### Data Flow
1. Client stores JWT in `localStorage`; all requests via the `useApi` hook inject `Authorization: Bearer <token>`
2. Server `auth` middleware verifies JWT and attaches `req.user`; all data queries filter by `userId`
3. `useBudgetData` hook is the central client-side state manager — fetches expenses, categories, budgets, and recurring rules

### Key Data Models (server/models/)
- **User** — email, bcrypt password, email verification OTP, reset OTP
- **Expense** — transactions (income/expense type), linked to User + Category; recurring ones have a `recurringId`
- **Category** — user-defined, initialized with defaults on first login
- **Budget** — monthly/yearly limits, per-category limits
- **RecurringExpense** — templates; editing/deleting preserves past generated Expense records

### Important Patterns
- **Data isolation:** Every Mongoose query includes `userId` — users can never access each other's data
- **Soft delete:** Accounts deactivated by setting `isVerified = false`, not hard-deleted
- **Recurring transactions:** RecurringExpense generates individual Expense documents linked via `recurringId`; past records are preserved on rule changes
- **AI Insights:** Entirely local statistical engine (`client/src/utils/insightEngine.js`) — no external API calls

### Test Files
- `server/tests/api.test.js` — route integration tests
- `server/tests/logic.test.js` — business logic unit tests
- `client/src/tests/components.test.jsx` — component tests
- `client/src/tests/insightEngine.test.js` — insight engine unit tests

### Additional Docs
- `server/openapi.yaml` — full API spec (OpenAPI 3.0)
- `doc/code_struct_server.md` / `doc/code_struct_client.md` — detailed module breakdowns
