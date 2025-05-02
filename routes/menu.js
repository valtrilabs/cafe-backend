const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const Session = require('../models/Session');
const multer = require('multer');
const path = require('path');

// Middleware to validate session token
const restrictAccess = async (req, res, next) => {
  try {
    const token = req.headers['x-session-token'] || req.query.token;
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

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Images only (JPEG/PNG)!'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// GET /api/menu - Fetch all menu items (requires session)
router.get('/', restrictAccess, async (req, res) => {
  try {
    const menuItems = await MenuItem.find();
    console.log('Menu items sent:', menuItems);
    res.json(menuItems);
  } catch (err) {
    console.error('Error fetching menu:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/menu/operator - Fetch all menu items for operators (no authentication)
router.get('/operator', async (req, res) => {
  try {
    const menuItems = await MenuItem.find();
    res.json(menuItems);
  } catch (err) {
    console.error('Error fetching menu for operator:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/menu - Create a new menu item with optional image
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, category, price, description, isAvailable } = req.body;
    if (!name || !category || !price) {
      return res.status(400).json({ error: 'Name, category, and price are required' });
    }
    const menuItem = new MenuItem({
      name,
      category,
      price: parseFloat(price),
      description,
      isAvailable: isAvailable === 'true' || isAvailable === true,
      image: req.file ? `/uploads/${req.file.filename}` : undefined,
    });
    await menuItem.save();
    console.log('Menu item saved:', menuItem);
    res.status(201).json(menuItem);
  } catch (err) {
    console.error('Error saving menu item:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/menu/:id - Update a menu item with optional image
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, category, price, description, isAvailable } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (category) updateData.category = category;
    if (price) updateData.price = parseFloat(price);
    if (description) updateData.description = description;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable === 'true' || isAvailable === true;
    if (req.file) updateData.image = `/uploads/${req.file.filename}`;

    const menuItem = await MenuItem.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    console.log('Menu item updated:', menuItem);
    res.json(menuItem);
  } catch (err) {
    console.error('Error updating menu item:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/menu/:id - Delete a menu item
router.delete('/:id', async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndDelete(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    console.log('Menu item deleted:', menuItem);
    res.json({ message: 'Menu item deleted' });
  } catch (err) {
    console.error('Error deleting menu item:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;