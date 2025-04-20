const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const { v4: uuidv4 } = require('uuid');
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

    // Invalidate existing active session for the table
    await Session.updateMany(
      { tableNumber, isActive: true },
      { isActive: false },
      { session }
    ).catch(err => {
      console.error(`Error updating sessions for table ${tableNumber}:`, err);
      throw err;
    });

    // Create new session
    const token = uuidv4();
    const newSession = new Session({ tableNumber, token });
    await newSession.save({ session }).catch(err => {
      console.error(`Error saving session for table ${tableNumber}:`, err);
      if (err.code === 11000) {
        throw new Error('Duplicate token detected. Please try again.');
      }
      throw err;
    });

    await session.commitTransaction();
    console.log(`Session created for table ${tableNumber}: ${token}`);
    res.status(201).json({ token });
  } catch (err) {
    await session.abortTransaction();
    console.error('Error creating session:', err.message, err.stack);
    if (err.message.includes('Duplicate token')) {
      res.status(409).json({ error: 'A session for this table is already being created. Please try again.' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  } finally {
    session.endSession();
  }
});

// GET /api/sessions/validate - Validate a session token
router.get('/validate', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      console.error('Missing token in validate request');
      return res.status(400).json({ error: 'Token is required' });
    }

    const session = await Session.findOne({ token }).populate('orderId');
    if (!session || !session.isActive) {
      console.log(`Invalid or inactive session for token: ${token}`);
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Check if session has expired (1 hour)
    const expiryTime = new Date(session.createdAt.getTime() + 60 * 60 * 1000);
    if (new Date() > expiryTime) {
      session.isActive = false;
      await session.save();
      console.log(`Session expired for token: ${token}`);
      return res.status(401).json({ error: 'Session expired' });
    }

    // Check if order is prepared or completed
    if (session.orderId && ['Prepared', 'Completed'].includes(session.orderId.status)) {
      session.isActive = false;
      await session.save();
      console.log(`Session invalidated due to prepared/completed order for token: ${token}`);
      return res.status(401).json({ error: 'Order prepared. Please scan QR code again' });
    }

    console.log(`Session validated for table ${session.tableNumber}, token: ${token}`);
    res.json({ tableNumber: session.tableNumber });
  } catch (err) {
    console.error('Error validating session:', err.message, err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;