# Testing Guide

This project includes comprehensive automated tests for both backend and frontend.

## Backend Tests (Node.js/Jest)
Located in `server/tests/`.

- `logic.test.js`: Unit tests for recurring expense date generation.
- `api.test.js`: Integration tests for key API endpoints (Auth, Data) using mocked Mongoose models.

### Setup
```bash
cd server
npm install
```

### Run Tests
```bash
npm test
```

## Frontend Tests (React/Vitest)
Located in `client/src/tests/`.

- `insightEngine.test.js`: Unit tests for Smart Insight logic.
- `components.test.jsx`: Component tests for `ExpenseModal`, `InsightCard` using `@testing-library/react`.

### Setup
```bash
cd client
npm install
```

### Run Tests
```bash
npm test
```

## Adding New Tests
- **Backend**: Add `.test.js` files in `server/tests/`.
- **Frontend**: Add `.test.js` or `.jsx` files in `client/src/tests/`.

