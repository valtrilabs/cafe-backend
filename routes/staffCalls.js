const express = require('express');
const router = express.Router();
const StaffCall = require('../models/StaffCall');

// POST /api/staff-calls - Record a staff call request
router.post('/', async (req, res) => {
  try {
    const { tableNumber, timestamp } = req.body;
    if (!tableNumber || !timestamp) {
      return res.status(400).json({ error: 'Table number and timestamp are required' });
    }
    const staffCall = new StaffCall({
      tableNumber,
      timestamp: new Date(timestamp),
      status: 'Pending'
    });
    await staffCall.save();
    console.log('Staff call recorded:', staffCall);
    res.status(201).json(staffCall);
  } catch (err) {
    console.error('Error recording staff call:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/staff-calls - Fetch pending staff calls
router.get('/', async (req, res) => {
  try {
    const staffCalls = await StaffCall.find({ status: 'Pending' }).sort({ timestamp: -1 });
    res.json(staffCalls);
  } catch (err) {
    console.error('Error fetching staff calls:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/staff-calls/:id - Mark staff call as resolved
router.put('/:id', async (req, res) => {
  try {
    const staffCall = await StaffCall.findByIdAndUpdate(
      req.params.id,
      { status: 'Resolved' },
      { new: true }
    );
    if (!staffCall) {
      return res.status(404).json({ error: 'Staff call not found' });
    }
    res.json(staffCall);
  } catch (err) {
    console.error('Error resolving staff call:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;