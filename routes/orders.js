const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Menu = require('../models/Menu');
const Session = require('../models/Session');
const mongoose = require('mongoose');

const authenticateOperator = (req, res, next) => {
  const token = req.headers['x-operator-token'];
  if (token === process.env.OPERATOR_TOKEN) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Validate session token and table number
const validateSession = async (req, res, next) => {
  const { token, tableNumber } = req.headers['x-session-token'] ? JSON.parse(req.headers['x-session-token']) : {};
  if (!token || !tableNumber) {
    return res.status(401).json({ error: 'Invalid or missing session token' });
  }
  try {
    const session = await Session.findOne({ tableNumber: Number(tableNumber), token });
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    req.session = session;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all orders
router.get('/', async (req, res) => {
  try {
    const { status, tableNumber } = req.query;
    const query = {};
    if (status) query.status = { $in: status.split(',') };
    if (tableNumber) query.tableNumber = Number(tableNumber);
    const orders = await Order.find(query).populate('items.itemId');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new order
router.post('/', validateSession, async (req, res) => {
  try {
    const { tableNumber, items } = req.body;
    if (tableNumber !== req.session.tableNumber) {
      return res.status(400).json({ error: 'Table number mismatch' });
    }
    const order = new Order({
      tableNumber,
      items,
      status: 'Pending'
    });
    await order.save();
    await Session.updateOne({ _id: req.session._id }, { orderId: order._id });
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update order status
router.put('/:id/status', authenticateOperator, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    order.status = status;
    await order.save();
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Mark order as paid
router.put('/:id/mark-paid', authenticateOperator, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    order.status = 'Paid';
    await order.save();
    // Invalidate session
    await Session.deleteOne({ orderId: order._id });
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Validate order and session
router.get('/validate', async (req, res) => {
  try {
    const { orderId, tableNumber, token } = req.query;
    const session = await Session.findOne({ tableNumber: Number(tableNumber), token, orderId });
    if (!session) {
      return res.status(401).json({ valid: false, redirect: '/scan-qr' });
    }
    const order = await Order.findById(orderId).populate('items.itemId');
    if (!order || order.status === 'Paid') {
      await Session.deleteOne({ _id: session._id });
      return res.status(401).json({ valid: false, redirect: '/scan-qr' });
    }
    res.json({ valid: true, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analytics (unchanged, included for completeness)
router.get('/analytics', async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const orders = await Order.find({ status: 'Completed' }).populate('items.itemId');

    const analytics = {
      revenue: {
        today: 0,
        week: 0,
        month: 0
      },
      orderCounts: {
        today: { total: 0, pending: 0, prepared: 0, completed: 0 },
        week: { total: 0, pending: 0, prepared: 0, completed: 0 },
        month: { total: 0, pending: 0, completed: 0 },
        year: { total: 0, pending: 0, prepared: 0, completed: 0 }
      },
      topItems: [],
      peakHours: Array(24).fill().map((_, i) => ({ hour: i, orders: 0 })),
      categories: [],
      paymentMethods: {},
      repeatOrderPercentage: 0
    };

    const itemSales = {};
    const categorySales = {};

    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const total = order.items.reduce((sum, item) => sum + (item.quantity * (item.itemId ? item.itemId.price : 0)), 0);

      // Revenue
      if (orderDate >= todayStart) analytics.revenue.today += total;
      if (orderDate >= weekStart) analytics.revenue.week += total;
      if (orderDate >= monthStart) analytics.revenue.month += total;

      // Order counts
      const periods = [
        { start: todayStart, key: 'today' },
        { start: weekStart, key: 'week' },
        { start: monthStart, key: 'month' },
        { start: yearStart, key: 'year' }
      ];
      periods.forEach(period => {
        if (orderDate >= period.start) {
          analytics.orderCounts[period.key].total++;
          if (order.status === 'Pending') analytics.orderCounts[period.key].pending++;
          if (order.status === 'Prepared') analytics.orderCounts[period.key].prepared++;
          if (order.status === 'Completed') analytics.orderCounts[period.key].completed++;
        }
      });

      // Peak hours
      if (orderDate >= todayStart) {
        const hour = orderDate.getHours();
        analytics.peakHours[hour].orders++;
      }

      // Item and category sales
      order.items.forEach(item => {
        if (item.itemId) {
          const itemId = item.itemId._id.toString();
          itemSales[itemId] = itemSales[itemId] || { name: item.itemId.name, quantity: 0, revenue: 0 };
          itemSales[itemId].quantity += item.quantity;
          itemSales[itemId].revenue += item.quantity * item.itemId.price;

          const category = item.itemId.category || 'Uncategorized';
          categorySales[category] = categorySales[category] || { name: category, revenue: 0, orders: 0 };
          categorySales[category].revenue += item.quantity * item.itemId.price;
          categorySales[category].orders += item.quantity;
        }
      });
    });

    // Top items
    analytics.topItems = Object.values(itemSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Categories
    analytics.categories = Object.values(categorySales);

    // Placeholder for payment methods and repeat orders
    analytics.paymentMethods = { Cash: analytics.revenue.month }; // Update when paymentMethod is added
    analytics.repeatOrderPercentage = 0; // Update when customerId is added

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;