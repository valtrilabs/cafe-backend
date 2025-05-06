const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors({
  origin: 'https://cafe-frontend-pi.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-session-id'],
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
}).then(() => {
  console.log('Connected to MongoDB successfully');
}).catch(err => {
  console.error('MongoDB connection error:', err.message, err.stack);
  process.exit(1);
});

// Verify MongoDB connection status
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});
mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err.message, err.stack);
});
mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
});

// Routes
app.use('/api/menu', require('./routes/menu'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/orders', require('./routes/orders'));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Ping the database to verify connection
    await mongoose.connection.db.admin().ping();
    res.status(200).json({ status: 'OK', database: 'Connected' });
  } catch (err) {
    console.error('Health check failed:', err.message);
    res.status(500).json({ status: 'Error', database: 'Disconnected' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});