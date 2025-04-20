const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String },
  isAvailable: { type: Boolean, default: true },
  image: { type: String }
});

module.exports = mongoose.model('MenuItem', menuItemSchema);