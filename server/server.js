require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// DB Connection
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

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
