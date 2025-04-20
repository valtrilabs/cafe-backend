const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  tableNumber: {
    type: Number,
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
}, {
  indexes: [
    { key: { tableNumber: 1, isActive: 1 }, unique: true },
  ],
});

module.exports = mongoose.model('Session', sessionSchema);