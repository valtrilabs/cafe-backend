const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const crypto = require('crypto');

// POST /api/sessions - Create a new session for a table
router.post('/', async (req, res) => {
  try {
    const { tableNumber } = req.body;
    if (!tableNumber) {
      return res.status(400).json({ error: 'Table number is required' });
    }

    // Check if there's an active session for the table
    let session = await Session.findOne({ tableNumber, isActive: true });
    if (session) {
      return res.json({ token: session.token });
    }

    // Generate a unique token
    const token = crypto.randomBytes(16).toString('hex');
    session = new Session({
      tableNumber,
      token,
      isActive: true,
    });
    await session.save();
    res.status(201).json({ token });
  } catch (err) {
    console.error('Error creating session:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/sessions/validate - Validate a session token
router.get('/validate', async (req, res) => {
  try {
    const { token, tableNumber } = req.query;
    if (!token || !tableNumber) {
      return res.status(400).json({ error: 'Token and table number are required' });
    }

    const session = await Session.findOne({ token, tableNumber, isActive: true });
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session. Please scan the QR code again.' });
    }

    res.json({ valid: true });
  } catch (err) {
    console.error('Error validating session:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;