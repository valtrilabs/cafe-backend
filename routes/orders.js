const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');

// Helper to generate unique orderNumber
async function generateOrderNumber() {
  const lastOrder = await Order.findOne().sort({ orderNumber: -1 });
  return lastOrder ? lastOrder.orderNumber + 1 : 1;
}

// POST /api/orders - Create a new order
router.post('/', async (req, res) => {
  try {
    console.log('Received order:', req.body);
    const { tableNumber, items } = req.body;
    if (!tableNumber || !items || items.length === 0) {
      return res.status(400).json({ error: 'Invalid order data' });
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
      orderNumber: await generateOrderNumber()
    });
    await order.save();
    console.log('Order saved:', order);
    res.status(201).json(order);
  } catch (err) {
    console.error('Error saving order:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/orders - Fetch orders with optional filters
router.get('/', async (req, res) => {
  try {
    const { date, tableNumber, dateFrom, dateTo } = req.query;
    let query = {};
    
    // Date filters
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
      query.createdAt = {
        $gte: new Date(dateFrom),
        $lte: new Date(new Date(dateTo).setHours(23, 59, 59, 999))
      };
    }

    // Table number filter
    if (tableNumber) {
      query.tableNumber = parseInt(tableNumber);
    }

    const orders = await Order.find(query)
      .populate({
        path: 'items.itemId',
        match: { _id: { $exists: true } }
      })
      .sort({ createdAt: -1 });
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

// PUT /api/orders/:id - Update order
router.put('/:id', async (req, res) => {
  try {
    const { tableNumber, items, status } = req.body;
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
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('items.itemId');
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    console.log('Order updated:', order);
    res.json(order);
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
      .sort((a, b) => b.quantity - a.quantity)
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

module.exports = router;