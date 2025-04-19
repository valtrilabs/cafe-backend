const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
  },
  image: {
    type: String, // Stores the path to the image (e.g., '/uploads/filename.jpg')
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model('MenuItem', menuItemSchema);