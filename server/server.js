require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serverless-friendly MongoDB Connection Helper
let isConnected = false;
async function connectToDatabase() {
    if (isConnected && mongoose.connection.readyState === 1) {
        return;
    }
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is not defined in environment variables');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log('MongoDB Connected');
}

// Middleware to ensure DB connection before handling API routes
app.use('/api', async (req, res, next) => {
    if (process.env.NODE_ENV === 'test') return next();
    try {
        await connectToDatabase();
        next();
    } catch (err) {
        console.error('Database connection error:', err);
        return res.status(500).json({ error: '資料庫連線失敗: ' + err.message });
    }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/data'));
app.use('/api/recurring', require('./routes/recurring'));
app.use('/api/import', require('./routes/import'));
app.use('/api/stocks', require('./routes/stocks'));

// Serve static files from React app in production
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// Serve uploads folder
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath));

// SPA Fallback only for standalone non-serverless mode
if (require.main === module) {
    app.get('(.*)', (req, res) => {
        res.sendFile(path.join(clientDistPath, 'index.html'));
    });
}

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
