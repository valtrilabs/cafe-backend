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
    console.log('Running pre-save hook for order:', JSON.stringify(this.toObject(), null, 2));
    if (this.isNew && !this.orderNumber) {
      const lastOrder = await this.constructor.findOne({}, { orderNumber: 1 }).sort({ orderNumber: -1 }).lean();
      const newOrderNumber = lastOrder && lastOrder.orderNumber ? lastOrder.orderNumber + 1 : 1000;
      console.log('Generated orderNumber:', newOrderNumber);
      this.orderNumber = newOrderNumber;
    } else {
      console.log('orderNumber already set or not a new document:', this.orderNumber);
    }
    next();
  } catch (err) {
    console.error('Error in pre-save hook:', err.message, err.stack);
    next(err);
  }
});

module.exports = mongoose.model('Order', orderSchema);