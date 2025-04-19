const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  tableNumber: {
    type: Number,
    required: true
  },
  sessionToken: {
    type: String,
    required: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Session', sessionSchema);