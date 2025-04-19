const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Session = require('../models/Session');
const { v4: uuidv4 } = require('uuid');

// POST /api/orders - Create a new order with session
router.post('/', async (req, res) => {
  try {
    console.log('Received order:', req.body);
    const { tableNumber, items, sessionToken, isManual } = req.body;
    if (!tableNumber || !items || items.length === 0) {
      return res.status(400).json({ error: 'Invalid order data' });
    }

    // Generate sequential order number
    const lastOrder = await Order.findOne().sort({ orderNumber: -1 });
    const orderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1000;

    // Validate session for non-manual orders
    let sessionId = null;
    if (!isManual) {
      if (!sessionToken) {
        return res.status(400).json({ error: 'Session token required for non-manual orders' });
      }
      const session = await Session.findOne({ token: sessionToken, tableNumber, isActive: true });
      if (!session) {
        return res.status(403).json({ error: 'Invalid or expired session. Please scan QR code again.' });
      }
      sessionId = session._id;
    } else {
      // For manual orders, create a temporary session
      const session = new Session({
        tableNumber,
        token: uuidv4(),
        isActive: true
      });
      await session.save();
      sessionId = session._id;
    }

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.itemId);
      if (!menuItem) {
        return res.status(400).json({ error: `Invalid itemId: ${item.itemId}` });
      }
    }

    const order = new Order({
      tableNumber,
      items,
      status: 'Pending',
      sessionId,
      paymentMethod: req.body.paymentMethod || 'Other',
      orderNumber
    });
    await order.save();
    console.log('Order saved:', order);
    res.status(201).json(order);
  } catch (err) {
    console.error('Error saving order:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/orders - Fetch orders with optional date filter
router.get('/', async (req, res) => {
  try {
    const { date, dateFrom, dateTo } = req.query;
    let query = {};
    if (date === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    } else if (date === 'past48') {
      const start = new Date(Date.now() - 48 * 60 * 60 * 1000);
      query.createdAt = { $gte: start };
    } else if (dateFrom && dateTo) {
      query.createdAt = { $gte: new Date(dateFrom), $lte: new Date(dateTo) };
    }
    const orders = await Order.find(query)
      .populate({
        path: 'items.itemId',
        match: { _id: { $exists: true } }
      })
      .sort(date === 'today' ? { createdAt: -1 } : {});
    const cleanedOrders = orders.map(order => ({
      ...order.toObject(),
      items: order.items.filter(item => item.itemId)
    }));
    console.log('Orders sent:', cleanedOrders);
    res.json(cleanedOrders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/orders/:id - Update order and expire session if moving to Prepared or Completed
router.put('/:id', async (req, res) => {
  try {
    const { tableNumber, items, status, paymentMethod } = req.body;
    const updateData = {};
    if (tableNumber) updateData.tableNumber = tableNumber;
    if (items) {
      for (const item of items) {
        const menuItem = await MenuItem.findById(item.itemId);
        if (!menuItem) {
          return res.status(400).json({ error: `Invalid itemId: ${item.itemId}` });
        }
      }
      updateData.items = items;
    }
    if (status) updateData.status = status;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Expire session if status changes to Prepared or Completed
    if ((status === 'Prepared' || status === 'Completed') && order.status === 'Pending') {
      await Session.findByIdAndUpdate(order.sessionId, { isActive: false });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('items.itemId');
    console.log('Order updated:', updatedOrder);
    res.json(updatedOrder);
  } catch (err) {
    console.error('Error updating order:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/orders/:id - Cancel order
router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    console.log('Order canceled:', order);
    res.json({ message: 'Order canceled' });
  } catch (err) {
    console.error('Error canceling order:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/orders/analytics - Fetch detailed analytics
router.get('/analytics', async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch orders
    const orders = await Order.find({}).populate('items.itemId');

    // Revenue
    const revenue = {
      today: 0,
      week: 0,
      month: 0
    };
    orders.forEach(order => {
      if (order.status === 'Completed') {
        const total = order.items.reduce((sum, item) => sum + (item.quantity * (item.itemId ? item.itemId.price : 0)), 0);
        const orderDate = new Date(order.createdAt);
        if (orderDate >= todayStart) revenue.today += total;
        if (orderDate >= weekStart) revenue.week += total;
        if (orderDate >= monthStart) revenue.month += total;
      }
    });

    // Order Count
    const orderCount = {
      total: orders.filter(o => new Date(o.createdAt) >= todayStart).length,
      pending: orders.filter(o => new Date(o.createdAt) >= todayStart && o.status === 'Pending').length,
      prepared: orders.filter(o => new Date(o.createdAt) >= todayStart && o.status === 'Prepared').length,
      completed: orders.filter(o => new Date(o.createdAt) >= todayStart && o.status === 'Completed').length
    };

    // Top 5 Items (Month)
    const itemCountsMonth = {};
    orders
      .filter(o => new Date(o.createdAt) >= monthStart && o.status === 'Completed')
      .forEach(order => {
        order.items.forEach(item => {
          if (item.itemId) {
            const itemId = item.itemId._id.toString();
            itemCountsMonth[itemId] = (itemCountsMonth[itemId] || { quantity: 0, revenue: 0 });
            itemCountsMonth[itemId].quantity += item.quantity;
            itemCountsMonth[itemId].revenue += item.quantity * item.itemId.price;
          }
        });
      });
    const topItems = Object.entries(itemCountsMonth)
      .map(([itemId, data]) => ({
        item: orders
          .flatMap(o => o.items)
          .find(i => i.itemId && i.itemId._id.toString() === itemId).itemId,
        ...data
      }))
      .filter(i => i.item)
      .sort((a, b) => b.quantity - b.quantity)
      .slice(0, 5)
      .map(i => ({ name: i.item.name, quantity: i.quantity, revenue: i.revenue }));

    // Slow-Moving Items (Week)
    const itemCountsWeek = {};
    orders
      .filter(o => new Date(o.createdAt) >= weekStart && o.status === 'Completed')
      .forEach(order => {
        order.items.forEach(item => {
          if (item.itemId) {
            const itemId = item.itemId._id.toString();
            itemCountsWeek[itemId] = (itemCountsWeek[itemId] || { quantity: 0 });
            itemCountsWeek[itemId].quantity += item.quantity;
          }
        });
      });
    const slowItems = Object.entries(itemCountsWeek)
      .map(([itemId, data]) => ({
        item: orders
          .flatMap(o => o.items)
          .find(i => i.itemId && i.itemId._id.toString() === itemId).itemId,
        ...data
      }))
      .filter(i => i.item)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 5)
      .map(i => ({ name: i.item.name, quantity: i.quantity }));

    // Peak Hours (Today)
    const peakHours = Array(24).fill(0);
    orders
      .filter(o => new Date(o.createdAt) >= todayStart)
      .forEach(o => {
        const hour = new Date(o.createdAt).getHours();
        peakHours[hour]++;
      });
    const peakHoursData = peakHours.map((count, hour) => ({
      hour: `${hour % 12 || 12}${hour < 12 ? 'AM' : 'PM'}`,
      orders: count
    }));

    // Category Performance (Month)
    const categoryRevenue = {};
    orders
      .filter(o => new Date(o.createdAt) >= monthStart && o.status === 'Completed')
      .forEach(order => {
        order.items.forEach(item => {
          if (item.itemId) {
            const category = item.itemId.category || 'Uncategorized';
            categoryRevenue[category] = (categoryRevenue[category] || 0) + (item.quantity * item.itemId.price);
          }
        });
      });
    const categoryData = Object.entries(categoryRevenue)
      .map(([name, revenue]) => ({ name, revenue }));

    res.json({
      revenue,
      orderCount,
      topItems,
      slowItems,
      peakHours: peakHoursData,
      categories: categoryData
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/orders/session - Create a new session
router.post('/session', async (req, res) => {
  try {
    const { tableNumber, forceNew } = req.body;
    if (!tableNumber || isNaN(tableNumber)) {
      return res.status(400).json({ error: 'Invalid table number' });
    }

    // Check the latest order for the table
    const latestOrder = await Order.findOne({ tableNumber }).sort({ createdAt: -1 });
    const isOrderFinal = latestOrder && ['Prepared', 'Completed'].includes(latestOrder.status);

    // Invalidate existing sessions if forceNew is true or latest order is Prepared/Completed
    if (forceNew || isOrderFinal) {
      await Session.updateMany({ tableNumber, isActive: true }, { isActive: false });
    }

    // Check for an active session
    const existingSession = await Session.findOne({ tableNumber, isActive: true });
    if (existingSession && !forceNew && !isOrderFinal) {
      return res.json({ token: existingSession.token });
    }

    // Create a new session
    const token = uuidv4();
    const session = new Session({
      tableNumber,
      token,
      isActive: true
    });
    await session.save();
    res.status(201).json({ token });
  } catch (err) {
    console.error('Error creating session:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/orders/session/:token - Validate session
router.get('/session/:token', async (req, res) => {
  try {
    const session = await Session.findOne({ token: req.params.token, isActive: true });
    if (!session) {
      return res.status(403).json({ error: 'Invalid or expired session' });
    }
    res.json({ tableNumber: session.tableNumber });
  } catch (err) {
    console.error('Error validating session:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/orders/export - Export orders for custom date range
router.get('/export', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom and dateTo are required' });
    }
    const orders = await Order.find({
      createdAt: { $gte: new Date(dateFrom), $lte: new Date(dateTo) }
    }).populate('items.itemId');

    const csvContent = [
      ['Order Number', 'Table Number', 'Items', 'Quantities', 'Total Amount', 'Date', 'Status', 'Payment Method'],
      ...orders.map(order => {
        const items = order.items.map(i => i.itemId ? i.itemId.name : '[Deleted Item]').join('; ');
        const quantities = order.items.map(i => i.quantity).join('; ');
        const total = order.items.reduce((sum, i) => sum + (i.itemId ? i.quantity * i.itemId.price : 0), 0).toFixed(2);
        return [
          order.orderNumber || 'N/A',
          order.tableNumber,
          `"${items}"`,
          `"${quantities}"`,
          total,
          new Date(order.createdAt).toISOString(),
          order.status,
          order.paymentMethod
        ].join(',');
      })
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="orders_${dateFrom}_${dateTo}.csv"`);
    res.send(csvContent);
  } catch (err) {
    console.error('Error exporting orders:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/orders/latest/:tableNumber - Fetch latest order for a table
router.get('/latest/:tableNumber', async (req, res) => {
  try {
    const order = await Order.findOne({ tableNumber: req.params.tableNumber })
      .sort({ createdAt: -1 })
      .populate('items.itemId');
    if (!order) {
      return res.status(404).json({ error: 'No orders found' });
    }
    res.json(order);
  } catch (err) {
    console.error('Error fetching latest order:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;