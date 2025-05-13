const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const { v4: uuidv4 } = require('uuid');

// Create or get a session for a table
router.post('/', async (req, res) => {
  try {
    const { tableNumber } = req.body;
    if (!tableNumber || tableNumber < 1 || tableNumber > 6) {
      return res.status(400).json({ error: 'Invalid table number' });
    }
    let session = await Session.findOne({ tableNumber });
    if (session) {
      // Session exists, return existing token
      return res.json({ token: session.token, tableNumber });
    }
    // Create new session
    const token = uuidv4();
    session = new Session({ tableNumber, token });
    await session.save();
    res.json({ token, tableNumber });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Session already exists for this table' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

module.exports = router;