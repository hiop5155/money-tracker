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

// DB Connection
if (process.env.NODE_ENV !== 'test') {
    mongoose
        .connect(process.env.MONGODB_URI)
        .then(() => console.log('MongoDB Connected'))
        .catch((err) => console.log(err));
}

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

// SPA Fallback: Return index.html for any wildcard GET route not handled by API
app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
