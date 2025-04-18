const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Images only (JPEG/PNG)!'));
  }
});

// GET /api/menu - Fetch all menu items
router.get('/', async (req, res) => {
  try {
    const menuItems = await MenuItem.find();
    res.json(menuItems);
  } catch (err) {
    console.error('Error fetching menu:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/menu - Create a new menu item
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, category, price, description, isAvailable } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;
    const menuItem = new MenuItem({
      name,
      category,
      price: parseFloat(price),
      description,
      isAvailable: isAvailable === 'true',
      image
    });
    await menuItem.save();
    res.status(201).json(menuItem);
  } catch (err) {
    console.error('Error creating menu item:', err);
    res.status(400).json({ error: err.message || 'Failed to create menu item' });
  }
});

// PUT /api/menu/:id - Update a menu item
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, category, price, description, isAvailable } = req.body;
    const updateData = {
      name,
      category,
      price: parseFloat(price),
      description,
      isAvailable: isAvailable === 'true' || isAvailable === true
    };
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }
    const menuItem = await MenuItem.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json(menuItem);
  } catch (err) {
    console.error('Error updating menu item:', err);
    res.status(400).json({ error: 'Failed to update menu item' });
  }
});

// DELETE /api/menu/:id - Delete a menu item
router.delete('/:id', async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndDelete(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json({ message: 'Menu item deleted' });
  } catch (err) {
    console.error('Error deleting menu item:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;