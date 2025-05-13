const express = require('express');
    const mongoose = require('mongoose');
    const cors = require('cors');
    require('dotenv').config();

    const app = express();

    // Middleware
    app.use(cors());
    app.use(express.json());

    // Routes
    app.use('/api/menu', require('./routes/menu'));
    app.use('/api/orders', require('./routes/orders'));
    app.use('/api/sessions', require('./routes/sessions'));

    // MongoDB Connection
    mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }).then(() => {
      console.log('Connected to MongoDB');
    }).catch((error) => {
      console.error('MongoDB connection error:', error);
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });