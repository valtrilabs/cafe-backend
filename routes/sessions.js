const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Order = require('../models/Order');
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

    // Invalidate existing active session
    await Session.updateMany(
      { tableNumber, isActive: true },
      { isActive: false },
      { session }
    ).catch(err => {
      console.error(`Error updating sessions for table ${tableNumber}:`, err);
      throw err;
    });

    // Clean up old inactive sessions (older than 24 hours)
    const expiryThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await Session.deleteMany(
      { tableNumber, isActive: false, createdAt: { $lt: expiryThreshold } },
      { session }
    ).catch(err => {
      console.error(`Error cleaning up old sessions for table ${tableNumber}:`, err);
      throw err;
    });

    // Create new session
    const token = uuidv4();
    const newSession = new Session({ tableNumber, token, orderId: null });
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
    let { token } = req.query;
    if (!token) {
      console.error('Missing token in validate request');
      return res.status(400).json({ error: 'Token is required' });
    }

    let session;
    let tableNumber;

    // Check if token is a static token (format: table-<tableNumber>-fixed)
    if (token.startsWith('table-') && token.endsWith('-fixed')) {
      const tableNum = parseInt(token.split('-')[1]);
      if (isNaN(tableNum) || tableNum < 1) {
        console.error('Invalid table number in static token:', token);
        return res.status(400).json({ error: 'Invalid table number in token' });
      }
      tableNumber = tableNum;

      // Find or create a session for this table
      session = await Session.findOne({ tableNumber: tableNum, isActive: true })
        .sort({ createdAt: -1 });

      if (!session) {
        console.log(`No active session for table ${tableNum}. Creating new session.`);
        const dynamicToken = uuidv4();
        session = new Session({ tableNumber: tableNum, token: dynamicToken, orderId: null });
        await session.save();
        console.log(`New session created for table ${tableNum}: ${dynamicToken}`);
        token = dynamicToken; // Use the dynamic token for subsequent operations
      } else {
        token = session.token; // Use the existing session's dynamic token
      }
    } else {
      // Handle dynamic token
      session = await Session.findOne({ token }).populate('orderId');
      if (!session) {
        console.log(`No session found for token: ${token}`);
        return res.status(401).json({ error: 'Invalid or expired session' });
      }
      tableNumber = session.tableNumber;
    }

    if (!session.isActive) {
      console.log(`Inactive session for token: ${token}`);
      return res.status(401).json({ error: 'Session expired or order prepared. Please scan QR code again' });
    }

    // Check if session has expired (1 hour)
    const expiryTime = new Date(session.createdAt.getTime() + 60 * 60 * 1000);
    if (new Date() > expiryTime) {
      session.isActive = false;
      await session.save();
      console.log(`Session expired for token: ${token}`);
      return res.status(401).json({ error: 'Session expired. Please scan QR code again' });
    }

    // Check if order exists and is prepared or completed
    if (session.orderId && ['Prepared', 'Completed'].includes(session.orderId.status)) {
      session.isActive = false;
      await session.save();
      console.log(`Session invalidated due to prepared/completed order for token: ${token}`);
      return res.status(401).json({ error: 'Order prepared. Please scan QR code again' });
    }

    console.log(`Session validated for table ${tableNumber}, token: ${token}`);
    res.json({ tableNumber, token }); // Return dynamic token
  } catch (err) {
    console.error('Error validating session:', err.message, err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/sessions/latest/:tableNumber - Get the latest active session token for a table
router.get('/latest/:tableNumber', async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const tableNum = Number(tableNumber);
    if (isNaN(tableNum) || tableNum < 1) {
      console.error('Invalid tableNumber:', tableNumber);
      return res.status(400).json({ error: 'Valid table number is required' });
    }

    console.log(`Fetching latest session for table ${tableNum}`);
    let session = await Session.findOne({ tableNumber: tableNum, isActive: true })
      .sort({ createdAt: -1 });

    if (!session) {
      console.log(`No active session for table ${tableNum}. Creating new session.`);
      const token = uuidv4();
      session = new Session({ tableNumber: tableNum, token, orderId: null });
      await session.save();
      console.log(`New session created for table ${tableNum}: ${token}`);
    }

    // Check if session has expired
    const expiryTime = new Date(session.createdAt.getTime() + 60 * 60 * 1000);
    if (new Date() > expiryTime) {
      session.isActive = false;
      await session.save();
      console.log(`Session expired for token: ${session.token}`);
      const token = uuidv4();
      session = new Session({ tableNumber: tableNum, token, orderId: null });
      await session.save();
      console.log(`New session created for table ${tableNum}: ${token}`);
    }

    console.log(`Returning latest token for table ${tableNum}: ${session.token}`);
    res.json({ token: session.token });
  } catch (err) {
    console.error('Error fetching latest session:', err.message, err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/sessions/order-status - Check order status for a session
router.get('/order-status', async (req, res) => {
  try {
    let { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    let session;
    if (token.startsWith('table-') && token.endsWith('-fixed')) {
      const tableNum = parseInt(token.split('-')[1]);
      if (isNaN(tableNum) || tableNum < 1) {
        return res.status(400).json({ error: 'Invalid table number in token' });
      }
      session = await Session.findOne({ tableNumber: tableNum, isActive: true })
        .sort({ createdAt: -1 });
      if (!session) {
        return res.status(404).json({ error: 'No active session for this table' });
      }
      token = session.token; // Use the dynamic token
    } else {
      session = await Session.findOne({ token }).populate('orderId');
      if (!session) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }
    }

    if (!session.isActive) {
      return res.status(401).json({ error: 'Session expired or order prepared. Please scan QR code again' });
    }

    if (!session.orderId) {
      return res.status(404).json({ error: 'No order associated with this session' });
    }

    const order = await Order.findById(session.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ orderId: order._id, status: order.status, orderNumber: order.orderNumber });
  } catch (err) {
    console.error('Error checking order status:', err.message, err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;