const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Session = require('../models/Session');
const Order = require('../models/Order');
const rateLimit = require('express-rate-limit');

// Rate limit for POST /api/sessions (5 requests per minute per table)
const createSessionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  keyGenerator: (req) => `${req.body.tableNumber}`, // Rate limit by tableNumber
  message: 'Too many session creation requests for this table. Please try again later.'
});

router.post('/', createSessionLimiter, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { tableNumber } = req.body;
    if (!tableNumber || tableNumber < 1 || tableNumber > 30) {
      console.error(`Invalid table number: ${tableNumber}`);
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Invalid table number' });
    }
    console.log(`Creating session for table ${tableNumber}`);
    await Session.updateMany(
      { tableNumber, isActive: true },
      { isActive: false },
      { session }
    );
    const token = uuidv4();
    const newSession = new Session({ tableNumber, token, orderId: null });
    await newSession.save({ session });
    await session.commitTransaction();
    session.endSession();
    console.log(`Session created for table ${tableNumber}: ${token}`);
    res.json({ token });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error creating session:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/validate', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      console.error('No token provided for validation');
      return res.status(400).json({ error: 'Token is required' });
    }
    console.log(`Validating session for token: ${token}`);
    const session = await Session.findOne({ token }).populate('orderId');
    if (!session) {
      console.error(`Session not found for token: ${token}`);
      return res.status(401).json({ error: 'Invalid session' });
    }
    if (!session.isActive) {
      console.error(`Session is inactive for token: ${token}`);
      return res.status(401).json({ error: 'Session expired or order prepared' });
    }
    if (session.orderId && ['Prepared', 'Completed'].includes(session.orderId.status)) {
      session.isActive = false;
      await session.save();
      console.log(`Session invalidated due to prepared/completed order for token: ${token}`);
      return res.status(401).json({ error: 'Order prepared. Please scan QR code again' });
    }
    console.log(`Session validated for table ${session.tableNumber}`);
    res.json({ tableNumber: session.tableNumber });
  } catch (err) {
    console.error('Error validating session:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/latest/:tableNumber', async (req, res) => {
  try {
    const tableNum = Number(req.params.tableNumber);
    if (isNaN(tableNum) || tableNum < 1 || tableNum > 30) {
      console.error(`Invalid table number for latest session: ${req.params.tableNumber}`);
      return res.status(400).json({ error: 'Invalid table number' });
    }
    console.log(`Fetching latest session for table ${tableNum}`);
    let session = await Session.findOne({ tableNumber: tableNum, isActive: true })
      .sort({ createdAt: -1 });
    if (!session) {
      console.log(`No active session for table ${tableNum}. Creating new session.`);
      const token = uuidv4();
      session = new Session({ tableNumber: tableNum, token, orderId: null });
      await session.save();
    }
    console.log(`Returning latest token for table ${tableNum}: ${session.token}`);
    res.json({ token: session.token });
  } catch (err) {
    console.error('Error fetching latest session:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/active-tables', async (req, res) => {
  try {
    console.log('Fetching tables with active orders');
    const activeOrders = await Order.find({ status: 'Pending' }).distinct('tableNumber');
    console.log(`Active tables with pending orders: ${activeOrders}`);
    res.json({ activeTables: activeOrders });
  } catch (err) {
    console.error('Error fetching active tables:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;