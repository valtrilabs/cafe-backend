const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  tableNumber: {
    type: Number,
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Session', sessionSchema);