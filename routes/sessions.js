const express = require('express');
const router = express.Router();
const Session = require('../models/Session');

// DELETE /api/sessions/:token - Invalidate a specific session
router.delete('/:token', async (req, res) => {
  try {
    const session = await Session.findOneAndUpdate(
      { token: req.params.token, isActive: true },
      { isActive: false },
      { new: true }
    );
    if (!session) {
      return res.status(404).json({ error: 'Session not found or already inactive' });
    }
    res.json({ message: 'Session invalidated' });
  } catch (err) {
    console.error('Session invalidation error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;