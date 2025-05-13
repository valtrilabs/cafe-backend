const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const crypto = require('crypto');

// Create a new session for a table
router.post('/', async (req, res) => {
  const { tableNumber } = req.body;
  if (!tableNumber || isNaN(tableNumber) || tableNumber < 1 || tableNumber > 6) {
    return res.status(400).json({ message: 'Invalid table number' });
  }

  try {
    // Check if an active session exists for the table
    let session = await Session.findOne({ tableNumber, isActive: true });
    if (session) {
      return res.json({ token: session.token });
    }

    // Create a new session
    const token = crypto.randomBytes(16).toString('hex');
    session = new Session({ tableNumber, token });
    await session.save();
    res.json({ token });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Validate a session token
router.get('/validate/:token', async (req, res) => {
  try {
    const session = await Session.findOne({ token: req.params.token, isActive: true });
    if (!session) {
      return res.status(401).json({ message: 'Invalid or expired session' });
    }
    res.json({ tableNumber: session.tableNumber, orderId: session.orderId });
  } catch (error) {
    console.error('Error validating session:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;