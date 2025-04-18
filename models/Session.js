const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  tableNumber: { type: Number, required: true },
  token: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now, expires: '24h' } // Auto-expire after 24 hours
});

module.exports = mongoose.model('Session', sessionSchema);