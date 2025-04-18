const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  tableNumber: { type: Number, required: true },
  items: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    quantity: { type: Number, required: true }
  }],
  status: { type: String, default: 'Pending' },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  paymentMethod: { type: String, default: 'Other' },
  orderNumber: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);