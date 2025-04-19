const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  tableNumber: { type: Number, required: true },
  orderNumber: { type: Number, unique: true, required: true },
  items: [
    {
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
      quantity: { type: Number, required: true }
    }
  ],
  status: { type: String, default: 'Pending', enum: ['Pending', 'Prepared', 'Completed'] },
  createdAt: { type: Date, default: Date.now }
});

orderSchema.pre('save', async function (next) {
  try {
    if (this.isNew && !this.orderNumber) {
      const lastOrder = await this.constructor.findOne().sort({ orderNumber: -1 });
      this.orderNumber = lastOrder && lastOrder.orderNumber ? lastOrder.orderNumber + 1 : 1000;
      console.log('Generated orderNumber:', this.orderNumber);
    }
    next();
  } catch (err) {
    console.error('Error generating orderNumber:', err);
    next(err);
  }
});

module.exports = mongoose.model('Order', orderSchema);