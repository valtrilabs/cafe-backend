const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  category: { type: String },
  isAvailable: { type: Boolean, default: true },
  image: { type: String }
});

module.exports = mongoose.model('MenuItem', menuItemSchema);