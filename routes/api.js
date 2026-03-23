const express = require('express');
const Product = require('../models/Product');

const router = express.Router();

// Fixed categories for API
const FIXED_CATEGORIES = [
  { slug: 'resin-jewelry', name: 'Resin Jewellery' },
  { slug: 'resin-preservation', name: 'Resin Preservation' },
  { slug: 'interior', name: 'Interior' },
  { slug: 'scented-candles', name: 'Scented Candles' }
];

// GET /api/categories  -> fixed list (no DB)
router.get('/categories', (req, res) => {
  res.json(FIXED_CATEGORIES);
});

// GET /api/products?category=<slug>
router.get('/products', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = {};

    if (category) {
      filter.categorySlug = category;
    }

    const products = await Product.find(filter);
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/products/:id
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Not found' });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;