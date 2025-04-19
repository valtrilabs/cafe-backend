const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const sessionRoutes = require('./routes/sessions');
const tableRoutes = require('./routes/tables'); // Add this line

const app = express();

// CORS configuration
app.use(cors({
  origin: 'https://cafe-frontend-pi.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Serve static files for menu item images
app.use('/uploads', express.static('public/uploads'));

// Routes
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/tables', tableRoutes); // Add this line


// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;