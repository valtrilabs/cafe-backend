const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const mongoose = require('mongoose');

// POST /api/sessions - Create a new session for a table
router.post('/', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { tableNumber } = req.body;
    if (!tableNumber || !Number.isInteger(tableNumber) || tableNumber < 1) {
      console.error('Invalid tableNumber:', tableNumber);
      return res.status(400).json({ error: 'Valid table number is required' });
    }

    console.log(`Creating session for table ${tableNumber}`);

    // Invalidate existing active session
    await Session.updateMany(
      { tableNumber, isActive: true },
      { isActive: false },
      { session }
    ).catch(err => {
      console.error(`Error updating sessions for table ${tableNumber}:`, err);
      throw err;
    });
    console.log(`Invalidated existing sessions for table ${tableNumber}`);

    // Clean up old inactive sessions (older than 24 hours)
    const expiryThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await Session.deleteMany(
      { tableNumber, isActive: false, createdAt: { $lt: expiryThreshold } },
      { session }
    ).catch(err => {
      console.error(`Error cleaning up old sessions for table ${tableNumber}:`, err);
      throw err;
    });
    console.log(`Cleaned up old sessions for table ${tableNumber}`);

    // Create new session
    const newSession = new Session({ tableNumber, orderId: null });
    await newSession.save({ session }).catch(err => {
      console.error(`Error saving session for table ${tableNumber}:`, err);
      throw err;
    });
    console.log(`New session saved:`, newSession);

    await session.commitTransaction();
    console.log(`Session created for table ${tableNumber}, sessionId: ${newSession._id}`);

    // Verify the session exists after transaction commit
    const savedSession = await Session.findById(newSession._id);
    if (!savedSession) {
      console.error(`Session not found after creation for table ${tableNumber}, sessionId: ${newSession._id}`);
      throw new Error('Session creation failed');
    }
    console.log(`Session verified after creation:`, savedSession);

    res.status(201).json({ sessionId: newSession._id.toString() });
  } catch (err) {
    await session.abortTransaction();
    console.error('Error creating session:', err.message, err.stack);
    res.status(500).json({ error: 'Server error' });
  } finally {
    session.endSession();
  }
});

// GET /api/sessions/:sessionId - Validate a session by ID
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      console.error('Missing sessionId in validate request');
      return res.status(400).json({ error: 'Session ID is required' });
    }

    console.log(`Validating session with sessionId: ${sessionId}`);
    const session = await Session.findById(sessionId).populate('orderId');
    console.log(`Session lookup result:`, session);
    if (!session) {
      console.log(`No session found for sessionId: ${sessionId}`);
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    if (!session.isActive) {
      console.log(`Inactive session for sessionId: ${sessionId}`);
      return res.status(401).json({ error: 'Session expired or order prepared. Please scan QR code again' });
    }

    // Check if session has expired (1 hour)
    const expiryTime = new Date(session.createdAt.getTime() + 60 * 60 * 1000);
    if (new Date() > expiryTime) {
      session.isActive = false;
      await session.save();
      console.log(`Session expired for sessionId: ${sessionId}`);
      return res.status(401).json({ error: 'Session expired. Please scan QR code again' });
    }

    // Check if order exists and is prepared or completed
    if (session.orderId && ['Prepared', 'Completed'].includes(session.orderId.status)) {
      session.isActive = false;
      await session.save();
      console.log(`Session invalidated due to prepared/completed order for sessionId: ${sessionId}`);
      return res.status(401).json({ error: 'Order prepared. Please scan QR code again' });
    }

    console.log(`Session validated for table ${session.tableNumber}, sessionId: ${sessionId}`);
    res.json({ tableNumber: session.tableNumber });
  } catch (err) {
    console.error('Error validating session:', err.message, err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;