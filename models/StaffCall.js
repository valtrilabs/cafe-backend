const mongoose = require('mongoose');

const staffCallSchema = new mongoose.Schema({
  tableNumber: { type: Number, required: true },
  timestamp: { type: Date, required: true },
  status: { type: String, default: 'Pending', enum: ['Pending', 'Resolved'] }
});

module.exports = mongoose.model('StaffCall', staffCallSchema);