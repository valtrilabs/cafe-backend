const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');

router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().populate('items.itemId');
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const analytics = {
      revenue: { today: 0, week: 0, month: 0 },
      orderCounts: {
        today: { total: 0, pending: 0, prepared: 0, completed: 0, paid: 0 },
        week: { total: 0, pending: 0, prepared: 0, completed: 0, paid: 0 },
        month: { total: 0, pending: 0, prepared: 0, completed: 0, paid: 0 },
        year: { total: 0, pending: 0, prepared: 0, completed: 0, paid: 0 }
      },
      topItems: [],
      peakHours: Array(24).fill(0).map((_, i) => ({ hour: i, orders: 0 })),
      categories: [],
      paymentMethods: {},
      repeatOrderPercentage: 0
    };

    // Process orders
    const itemCounts = {};
    const categoryRevenue = {};
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const total = order.items.reduce((sum, item) => sum + (item.quantity * (item.itemId ? item.itemId.price : 0)), 0);

      // Revenue and order counts
      if (orderDate >= todayStart) {
        analytics.revenue.today += total;
        analytics.orderCounts.today.total++;
        analytics.orderCounts.today[order.status.toLowerCase()]++;
        if (orderDate.getDate() === now.getDate()) {
          const hour = orderDate.getHours();
          analytics.peakHours[hour].orders++;
        }
      }
      if (orderDate >= weekStart) {
        analytics.revenue.week += total;
        analytics.orderCounts.week.total++;
        analytics.orderCounts.week[order.status.toLowerCase()]++;
      }
      if (orderDate >= monthStart) {
        analytics.revenue.month += total;
        analytics.orderCounts.month.total++;
        analytics.orderCounts.month[order.status.toLowerCase()]++;
      }
      if (orderDate >= yearStart) {
        analytics.orderCounts.year.total++;
        analytics.orderCounts.year[order.status.toLowerCase()]++;
      }

      // Top items and categories
      order.items.forEach(item => {
        if (item.itemId) {
          const itemId = item.itemId._id.toString();
          itemCounts[itemId] = itemCounts[itemId] || { name: item.itemId.name, quantity: 0, revenue: 0 };
          itemCounts[itemId].quantity += item.quantity;
          itemCounts[itemId].revenue += item.quantity * item.itemId.price;

          const category = item.itemId.category || 'Uncategorized';
          categoryRevenue[category] = categoryRevenue[category] || { name: category, revenue: 0, orders: 0 };
          categoryRevenue[category].revenue += item.quantity * item.itemId.price;
          categoryRevenue[category].orders += item.quantity;
        }
      });
    });

    // Format top items
    analytics.topItems = Object.values(itemCounts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Format categories
    analytics.categories = Object.values(categoryRevenue);

    // Mock payment methods (since not implemented in schema)
    analytics.paymentMethods = {
      Cash: analytics.revenue.month * 0.6,
      Card: analytics.revenue.month * 0.3,
      UPI: analytics.revenue.month * 0.1
    };

    // Mock repeat order percentage
    analytics.repeatOrderPercentage = 20;

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;