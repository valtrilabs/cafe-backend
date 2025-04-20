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
    const session = new Session({
      tableId: parseInt(tableId),
      sessionToken,
      status: 'active',
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
    });
    await session.save();
    console.log('Session created:', session);
    res.status(201).json({ sessionToken });
  } catch (err) {
    console.error('Error saving session:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Session token already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/session/status - Check session status
router.get('/status', async (req, res) => {
  try {
    const { table, session } = req.query;
    if (!table || !session) {
      return res.status(400).json({ error: 'Table ID and session token are required' });
    }
    const sessionDoc = await Session.findOne({ tableId: parseInt(table), sessionToken: session });
    if (!sessionDoc) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ status: sessionDoc.status });
  } catch (err) {
    console.error('Error checking session status:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/session/tables - Get list of available tables
router.get('/tables', async (req, res) => {
  try {
    // Hardcoded list of tables (adjust as needed)
    const tables = [
      { tableId: 1 },
      { tableId: 2 },
      { tableId: 3 },
      { tableId: 4 },
      { tableId: 5 }
    ];
    res.json({ tables });
  } catch (err) {
    console.error('Error fetching tables:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;