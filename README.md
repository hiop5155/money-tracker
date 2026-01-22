# Money Tracker

A full-stack personal finance management application built with Node.js, Express, MongoDB, and React (Vite).

## Project Overview

The Money Tracker allows users to track their expenses and income, manage categories, and set detailed budgets. It features a secure authentication system, data visualization, recurring transaction management, and CSV import/export capabilities.

### Architecture & Tech Stack

- **Frontend:** React 19 (Vite), Tailwind CSS v4, Recharts, Lucide React
- **Backend:** Node.js, Express.js v5
- **Database:** MongoDB (Mongoose)
- **Authentication:** JWT (JSON Web Tokens) with email verification (Nodemailer)

## Features

- **User Authentication:**
    - Secure sign-up and login using JWT.
    - Email verification for new accounts.
    - Password reset functionality via OTP.
- **Transaction Tracking:**
    - Track both **Income** and **Expenses**.
    - Calendar interface for daily overview.
    - **Calculator Keypad** for easy amount input.
- **Advanced Search:** Filter transactions by keyword, date, category, and amount.
- **Recurring Transactions:** Set up automatic monthly or yearly records (Smart overlap handling).
- **Budgeting:**
    - Set monthly and yearly total budgets.
    - **Category Limits:** Set specific spending limits for individual categories.
    - **Remain Budget:** Real-time calculation of remaining budget while adding expenses.
- **Smart Analytics:**
    - **Trend Analysis:** Historical view with Year and Period (H1/H2) selection.
    - **AI Insights:** Local statistical engine for anomaly detection and burn rate warnings with actionable advice.
- **Data Visualization:** Interactive charts (Pie/Bar) to visualize spending and income patterns.
- **Dark Mode:** Built-in dark/light theme toggle.
- **Data Import/Export:** Import/Export data via CSV.

## Testing & Quality Assurance

Comprehensive testing suite included:

- **Frontend:** Vitest + React Testing Library (Component & Logic tests)
- **Backend:** Jest + Supertest (API & Logic integration tests)

See [TESTING.md](./TESTING.md) for full documentation.

## Getting Started

### Prerequisites

- Node.js (v16 or higher recommended)
- MongoDB (Local installation or MongoDB Atlas account)

### Installation & Setup

#### 1. Backend Setup

From the project root:

```bash
cd server
# Install dependencies
npm install

# Configure environment variables
# Create a .env file in the server directory with the following:
# MONGODB_URI=your_mongodb_connection_string
# JWT_SECRET=your_jwt_secret_key
# PORT=5001  <-- Important: Must be 5001 for frontend proxy
# EMAIL_USER=your_email_for_sending_codes
# EMAIL_PASS=your_email_password_or_app_password

# Start the server
npm start
```

#### 2. Frontend Setup

From the `client` directory:

```bash
cd client
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.

## Development Conventions

- **Backend:** Uses CommonJS modules. Runs on port 5001 (configurable via .env, defaults to 5001 in code).
- **Frontend:** Built with React and Vite using ES Modules. Proxies API requests to port 5001.
- **Security:** Data routes require a valid JWT. Users can only access their own data.

## Code Formatting

This project uses **Prettier** for consistent code formatting.

**Server:**

```bash
cd server
npm run format
```

**Client:**

```bash
cd client
npm run format
```
