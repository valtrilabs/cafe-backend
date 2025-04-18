const express = require('express');
const router = express.Router();
const Session = require('../models/Session');

router.post('/', async (req, res) => {
  try {
    const { tableNumber } = req.body;
    if (!tableNumber || isNaN(tableNumber)) {
      return res.status(400).json({ error: 'Invalid table number' });
    }
    const session = new Session({ tableNumber: parseInt(tableNumber) });
    await session.save();
    res.status(201).json(session);
  } catch (err) {
    console.error('Session creation error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;