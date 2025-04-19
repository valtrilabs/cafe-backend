// backend/routes/tables.js
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Define static table numbers (adjust as needed)
    const tables = Array.from({ length: 10 }, (_, i) => ({ number: i + 1 }));
    res.json(tables);
  } catch (err) {
    console.error('Error fetching tables:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;