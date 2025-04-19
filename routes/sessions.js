const express = require('express');
const router = express.Router();
const Session = require('../models/Session');

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
    // Generate a unique session token
    const sessionToken = Math.random().toString(36).substring(2);
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
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;