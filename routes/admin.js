const express = require('express');
const path = require('path');
const multer = require('multer');
const { ensureAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

const router = express.Router();

// Multer storage for product images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'public', 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

// Auth
router.get('/login', adminController.getLogin);
router.post('/login', adminController.postLogin);
router.get('/logout', adminController.logout);

// Dashboard
router.get('/dashboard', ensureAdmin, adminController.getDashboard);

// Products (only)
router.get('/products', ensureAdmin, adminController.listProducts);
router.get('/products/new', ensureAdmin, adminController.getProductForm);
router.post(
  '/products',
  ensureAdmin,
  upload.single('image'),
  adminController.postProduct
);
router.get('/products/edit/:id', ensureAdmin, adminController.getProductForm);
router.post(
  '/products/edit/:id',
  ensureAdmin,
  upload.single('image'),
  adminController.updateProduct
);
router.post('/products/delete/:id', ensureAdmin, adminController.deleteProduct);

// Workshops (separate from products; images → public/uploads)
router.get('/workshops', ensureAdmin, adminController.listWorkshops);
router.get('/workshops/new', ensureAdmin, adminController.getWorkshopForm);
router.post(
  '/workshops',
  ensureAdmin,
  upload.single('image'),
  adminController.postWorkshop
);
router.get('/workshops/edit/:id', ensureAdmin, adminController.getWorkshopForm);
router.post(
  '/workshops/edit/:id',
  ensureAdmin,
  upload.single('image'),
  adminController.updateWorkshop
);
router.post('/workshops/:id', ensureAdmin, adminController.deleteWorkshop);

module.exports = router;