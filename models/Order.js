const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  tableNumber: { type: Number, required: true },
  orderNumber: { type: Number, unique: true },
  items: [
    {
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
      quantity: { type: Number, required: true }
    }
  ],
  status: { type: String, default: 'Pending', enum: ['Pending', 'Prepared', 'Completed'] },
  paymentMethod: { type: String, enum: ['Cash', 'UPI', 'Card', 'Other', null], default: null },
  createdAt: { type: Date, default: Date.now }
});

orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const lastOrder = await this.constructor.findOne().sort({ orderNumber: -1 });
    this.orderNumber = lastOrder && lastOrder.orderNumber ? lastOrder.orderNumber + 1 : 1000;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);