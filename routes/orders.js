const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Session = require('../models/Session');

// Middleware to validate session token
const restrictAccess = async (req, res, next) => {
  try {
    const token = req.headers['x-session-token'] || req.body.token;
    if (!token) {
      return res.status(401).json({ error: 'Session token is required' });
    }

    const session = await Session.findOne({ token, isActive: true });
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Check if session has expired (1 hour)
    const expiryTime = new Date(session.createdAt.getTime() + 60 * 60 * 1000);
    if (new Date() > expiryTime) {
      session.isActive = false;
      await session.save();
      return res.status(401).json({ error: 'Session expired' });
    }

    req.session = session;
    next();
  } catch (err) {
    console.error('Error validating session:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Categories for each printer
const printer1Categories = [
  'Main Course', 'Street Food', 'Salads', 'Desserts'
];
const printer2Categories = ['Drinks'];

// Function to generate KOT content for an 80mm thermal printer (32 chars per line)
const generateKOT = (order, items, printerName) => {
  const maxLineLength = 32; // 80mm printer, ~32 chars per line with default font
  const header = `=== GSaheb Cafe KOT ===`;
  const footer = `=========================`;
  const orderInfo = [
    `Order #: ${order.orderNumber}`,
    `Table #: ${order.tableNumber}`,
    `Time: ${new Date(order.createdAt).toLocaleString('en-IN', { hour12: true })}`,
    `Printer: ${printerName}`,
    `-------------------------`
  ];

  // Item list
  const itemLines = items.map(item => {
    const itemName = item.itemId.name;
    const qty = item.quantity.toString();
    // Truncate item name if too long, leave space for qty
    const maxNameLength = maxLineLength - qty.length - 5; // 5 for " x " and padding
    const truncatedName = itemName.length > maxNameLength 
      ? itemName.substring(0, maxNameLength - 3) + '...' 
      : itemName.padEnd(maxNameLength, ' ');
    return `${truncatedName} x ${qty}`;
  });

  // Combine all parts
  const kotContent = [
    header,
    ...orderInfo,
    ...itemLines,
    footer
  ].join('\n');

  return kotContent;
};

// POST /api/orders - Create a new order and store KOT content
router.post('/', restrictAccess, async (req, res) => {
  try {
    console.log('Received order:', req.body);
    const { tableNumber, items, token } = req.body;
    if (!tableNumber || !items || items.length === 0 || !token) {
      return res.status(400).json({ error: 'Invalid order data or token' });
    }

    // Validate session
    const session = await Session.findOne({ token, tableNumber, isActive: true });
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
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
      status: 'Pending'
    });
    await order.save();

    // Link order to session
    session.orderId = order._id;
    await session.save();

    // Populate order items for KOT generation
    const populatedOrder = await Order.findById(order._id).populate('items.itemId');

    // Split items by category for each printer
    const printer1Items = populatedOrder.items.filter(item => 
      printer1Categories.includes(item.itemId.category)
    );
    const printer2Items = populatedOrder.items.filter(item => 
      printer2Categories.includes(item.itemId.category)
    );

    // Generate and store KOT content
    if (printer1Items.length > 0) {
      const kotContent = generateKOT(populatedOrder, printer1Items, 'Kitchen Section 1');
      populatedOrder.kotPrinter1 = { content: kotContent, printed: false };
    }
    if (printer2Items.length > 0) {
      const kotContent = generateKOT(populatedOrder, printer2Items, 'Kitchen Section 2');
      populatedOrder.kotPrinter2 = { content: kotContent, printed: false };
    }
    await populatedOrder.save();

    console.log('Order saved with KOTs:', populatedOrder);
    res.status(201).json({ orderNumber: order.orderNumber });
  } catch (err) {
    console.error('Error saving order:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/orders/pending-kots - Fetch orders with unprinted KOTs
router.get('/pending-kots', async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [
        { 'kotPrinter1.printed': false, 'kotPrinter1.content': { $exists: true } },
        { 'kotPrinter2.printed': false, 'kotPrinter2.content': { $exists: true } }
      ]
    }).populate('items.itemId');
    res.json(orders);
  } catch (err) {
    console.error('Error fetching pending KOTs:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/orders/mark-kot-printed - Mark a KOT as printed
router.post('/mark-kot-printed', async (req, res) => {
  try {
    const { orderId, printer } = req.body;
    if (!orderId || !printer) {
      return res.status(400).json({ error: 'orderId and printer are required' });
    }

    const updateField = printer === 'Printer 1' ? 'kotPrinter1.printed' : 'kotPrinter2.printed';
    const order = await Order.findByIdAndUpdate(
      orderId,
      { [updateField]: true },
      { new: true }
    );
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: `KOT for ${printer} marked as printed` });
  } catch (err) {
    console.error('Error marking KOT as printed:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/orders - Fetch orders with optional status and date filter
router.get('/', async (req, res) => {
  try {
    const { status, date, tableNumber } = req.query;
    let query = {};
    
    // Handle status filter (support multiple statuses via comma-separated list)
    if (status) {
      const statusArray = status.split(',').map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase());
      query.status = { $in: statusArray };
    }
    
    // Handle tableNumber filter
    if (tableNumber) {
      query.tableNumber = Number(tableNumber);
    }

    // Handle date filter
    if (date === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    } else if (date === 'past48') {
      const start = new Date(Date.now() - 48 * 60 * 60 * 1000);
      query.createdAt = { $gte: start };
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

// PUT /api/orders/:id - Update order
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
    if (paymentMethod) {
      if (!['Cash', 'UPI', 'Card', 'Other'].includes(paymentMethod)) {
        return res.status(400).json({ error: `Invalid paymentMethod: ${paymentMethod}` });
      }
      updateData.paymentMethod = paymentMethod;
    } else if (status === 'Completed') {
      return res.status(400).json({ error: 'paymentMethod is required for Completed status' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('items.itemId');
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Invalidate session if order is Prepared or Completed
    if (['Prepared', 'Completed'].includes(status)) {
      await Session.updateOne({ orderId: order._id }, { isActive: false });
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
    // Invalidate session if order is canceled
    await Session.updateOne({ orderId: order._id }, { isActive: false });
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
    const yearStart = new Date(now.getFullYear(), 0, 1);

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

    // Order Counts
    const orderCounts = {
      today: { total: 0, pending: 0, prepared: 0, completed: 0 },
      week: { total: 0, pending: 0, prepared: 0, completed: 0 },
      month: { total: 0, pending: 0, prepared: 0, completed: 0 },
      year: { total: 0, pending: 0, prepared: 0, completed: 0 }
    };
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const periods = [
        { name: 'today', start: todayStart },
        { name: 'week', start: weekStart },
        { name: 'month', start: monthStart },
        { name: 'year', start: yearStart }
      ];
      periods.forEach(period => {
        if (orderDate >= period.start) {
          orderCounts[period.name].total += 1;
          if (order.status === 'Pending') orderCounts[period.name].pending += 1;
          if (order.status === 'Prepared') orderCounts[period.name].prepared += 1;
          if (order.status === 'Completed') orderCounts[period.name].completed += 1;
        }
      });
    });

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
    const categoryStats = {};
    orders
      .filter(o => new Date(o.createdAt) >= monthStart && o.status === 'Completed')
      .forEach(order => {
        order.items.forEach(item => {
          if (item.itemId) {
            const category = item.itemId.category || 'Uncategorized';
            categoryStats[category] = categoryStats[category] || { revenue: 0, orders: new Set() };
            categoryStats[category].revenue += item.quantity * item.itemId.price;
            categoryStats[category].orders.add(order._id.toString());
          }
        });
      });
    const categoryData = Object.entries(categoryStats)
      .map(([name, stats]) => ({
        name,
        revenue: stats.revenue,
        orders: stats.orders.size
      }));

    // Payment Methods (Month)
    const paymentMethods = {};
    orders
      .filter(o => new Date(o.createdAt) >= monthStart && o.status === 'Completed')
      .forEach(order => {
        const method = order.paymentMethod || 'Unknown';
        const total = order.items.reduce((sum, item) => sum + (item.quantity * (item.itemId ? item.itemId.price : 0)), 0);
        paymentMethods[method] = (paymentMethods[method] || 0) + total;
      });

    // Repeat Orders (Month)
    const customerOrders = {};
    orders
      .filter(o => new Date(o.createdAt) >= monthStart && o.status === 'Completed')
      .forEach(order => {
        if (order.customerId) {
          customerOrders[order.customerId] = (customerOrders[order.customerId] || 0) + 1;
        }
      });
    const repeatCustomers = Object.values(customerOrders).filter(count => count > 1).length;
    const totalCustomers = Object.keys(customerOrders).length;
    const repeatOrderPercentage = totalCustomers ? (repeatCustomers / totalCustomers * 100).toFixed(2) : 0;

    res.json({
      revenue,
      orderCounts,
      topItems,
      peakHours: peakHoursData,
      categories: categoryData,
      paymentMethods,
      repeatOrderPercentage
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;