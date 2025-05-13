const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  tableNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 6
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 7200 // Sessions expire after 2 hours
  }
});

module.exports = mongoose.model('Session', sessionSchema);