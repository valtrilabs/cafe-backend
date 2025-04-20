const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  tableNumber: { type: Number, required: true },
  token: { type: String, required: true, unique: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  createdAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
});

// Unique index to allow only one active session per table
sessionSchema.index({ tableNumber: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

module.exports = mongoose.model('Session', sessionSchema);