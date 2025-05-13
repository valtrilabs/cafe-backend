const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Session = require('../models/Session');
const MenuItem = require('../models/MenuItem');

// Middleware to validate session token
const validateSession = async (req, res, next) => {
  const token = req.headers['x-session-token'];
  if (!token) {
    return res.status(401).json({ message: 'Session token required' });
  }
  try {
    const session = await Session.findOne({ token, isActive: true });
    if (!session) {
      return res.status(401).json({ message: 'Invalid or expired session' });
    }
    req.session = session;
    next();
  } catch (error) {
    console.error('Error validating session:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new order
router.post('/', validateSession, async (req, res) => {
  const { tableNumber, items } = req.body;
  if (!tableNumber || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Invalid order data' });
  }
  if (tableNumber !== req.session.tableNumber) {
    return res.status(403).json({ message: 'Table number mismatch' });
  }

  try {
    // Validate items
    const itemIds = items.map(item => item.itemId);
    const menuItems = await MenuItem.find({ _id: { $in: itemIds } });
    if (menuItems.length !== itemIds.length) {
      return res.status(400).json({ message: 'Some items are invalid' });
    }

    // Create order
    const orderNumber = Math.floor(1000 + Math.random() * 9000);
    const order = new Order({
      tableNumber,
      items,
      orderNumber,
      status: 'Pending'
    });
    await order.save();

    // Update session with orderId
    req.session.orderId = order._id;
    req.session.isActive = true;
    await req.session.save();

    res.json({ orderId: order._id, orderNumber, message: 'Order placed successfully' });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update an existing order
router.put('/:id', validateSession, async (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Invalid order data' });
  }

  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.tableNumber !== req.session.tableNumber || order._id.toString() !== req.session.orderId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to edit this order' });
    }
    if (order.status === 'Paid') {
      return res.status(403).json({ message: 'Cannot edit a paid order' });
    }

    // Validate items
    const itemIds = items.map(item => item.itemId);
    const menuItems = await MenuItem.find({ _id: { $in: itemIds } });
    if (menuItems.length !== itemIds.length) {
      return res.status(400).json({ message: 'Some items are invalid' });
    }

    order.items = items;
    await order.save();
    res.json({ orderId: order._id, orderNumber: order.orderNumber, message: 'Order updated successfully' });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark order as paid
router.post('/:id/paid', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.status === 'Paid') {
      return res.status(400).json({ message: 'Order already paid' });
    }

    order.status = 'Paid';
    await order.save();

    // Invalidate session
    await Session.updateMany(
      { orderId: order._id, isActive: true },
      { isActive: false }
    );

    res.json({ message: 'Order marked as paid' });
  } catch (error) {
    console.error('Error marking order as paid:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get order details
router.get('/:id', validateSession, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.itemId');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.tableNumber !== req.session.tableNumber || order._id.toString() !== req.session.orderId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to view this order' });
    }
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all orders (for dashboards)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().populate('items.itemId').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;