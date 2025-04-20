const mongoose = require('mongoose');

// Define the session schema
const sessionSchema = new mongoose.Schema({
  tableId: { type: Number, required: true },
  sessionToken: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ['active', 'pending', 'prepared', 'expired'],
    default: 'active'
  },
  createdAt: { type: Date, default: Date.now, expires: '90m' } // Sessions expire after 90 minutes
});

// Check if the model is already defined to avoid OverwriteModelError
const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);

module.exports = Session;