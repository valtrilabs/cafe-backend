const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  tableNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 6 // Assuming 6 tables
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  token: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '24h' // Sessions expire after 24 hours
  }
});

// Ensure only one active session per table
sessionSchema.index({ tableNumber: 1 }, { unique: true });

module.exports = mongoose.model('Session', sessionSchema);