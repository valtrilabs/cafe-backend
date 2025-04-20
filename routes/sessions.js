const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const { v4: uuidv4 } = require('uuid');

// POST /api/sessions - Create a new session for a table
router.post('/', async (req, res) => {
  try {
    const { tableNumber } = req.body;
    if (!tableNumber) {
      return res.status(400).json({ error: 'Table number is required' });
    }

    // Invalidate existing active session for the table
    await Session.updateMany(
      { tableNumber, isActive: true },
      { isActive: false }
    );

    // Create new session
    const token = uuidv4();
    const session = new Session({ tableNumber, token });
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
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const session = await Session.findOne({ token }).populate('orderId');
    if (!session || !session.isActive) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Check if session has expired (1 hour)
    const expiryTime = new Date(session.createdAt.getTime() + 60 * 60 * 1000);
    if (new Date() > expiryTime) {
      session.isActive = false;
      await session.save();
      return res.status(401).json({ error: 'Session expired' });
    }

    // Check if order is prepared or completed
    if (session.orderId && ['Prepared', 'Completed'].includes(session.orderId.status)) {
      session.isActive = false;
      await session.save();
      return res.status(401).json({ error: 'Order prepared. Please scan QR code again' });
    }

    res.json({ tableNumber: session.tableNumber });
  } catch (err) {
    console.error('Error validating session:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;