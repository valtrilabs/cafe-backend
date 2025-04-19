const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const crypto = require('crypto');

// POST /api/sessions - Generate a new session token
router.post('/', async (req, res) => {
  try {
    const { tableNumber } = req.body;
    if (!tableNumber) {
      return res.status(400).json({ error: 'Table number is required' });
    }
    const parsedTableNumber = parseInt(tableNumber);
    if (isNaN(parsedTableNumber) || parsedTableNumber < 1) {
      return res.status(400).json({ error: 'Invalid table number' });
    }

    // Invalidate existing sessions for this table
    await Session.updateMany(
      { tableNumber: parsedTableNumber, isActive: true },
      { isActive: false }
    );

    // Generate a unique session token
    const sessionToken = crypto.randomBytes(16).toString('hex');
    if (!sessionToken) {
      throw new Error('Failed to generate session token');
    }

    const session = new Session({
      tableNumber: parsedTableNumber,
      sessionToken,
      isActive: true
    });
    await session.save();
    console.log('Session created:', session);
    res.status(201).json({ sessionToken });
  } catch (err) {
    console.error('Error creating session:', err.message, err.stack);
    if (err.code === 11000) {
      return res.status(500).json({ error: 'Session token conflict. Please try again.' });
    }
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;