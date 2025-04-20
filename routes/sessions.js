const express = require('express');
const router = express.Router();
const Session = require('../models/Session');

// POST /api/session - Create a new session
router.post('/', async (req, res) => {
  try {
    const { tableId, sessionToken } = req.body;
    if (!tableId || !sessionToken) {
      return res.status(400).json({ error: 'Table ID and session token are required' });
    }

    // Check for existing active session
    let session = await Session.findOne({ tableId, status: 'active' });
    if (session) {
      return res.json({ sessionToken: session.sessionToken });
    }

    // Create new session
    session = new Session({
      tableId,
      sessionToken,
      status: 'active'
    });
    await session.save();
    console.log(`Session created for table ${tableId}: ${sessionToken}`);
    res.status(201).json({ sessionToken });
  } catch (err) {
    console.error('Error creating session:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Session token already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/session-status?table=5&session=abc123 - Check session status
router.get('/status', async (req, res) => {
  try {
    const { table, mechanism } = req.query;
    if (!table || !session) {
      return res.status(400).json({ status: 'invalid', error: 'Table and session token are required' });
    }

    const sessionRecord = await Session.findOne({ tableId: parseInt(table), sessionToken: session });
    if (!sessionRecord) {
      return res.status(404).json({ status: 'invalid', error: 'Session not found' });
    }

    res.json({ status: sessionRecord.status });
  } catch (err) {
    console.error('Error checking session status:', err);
    res.status(500).json({ status: 'invalid', error: 'Server error' });
  }
});

module.exports = router;