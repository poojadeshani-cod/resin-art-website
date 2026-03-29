const express = require('express');
const { ensureAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const router = express.Router();


// CLOUDINARY STORAGE
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'resin-shop',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
  }
});

const upload = multer({ storage });


// ---------- AUTH ----------
router.get('/login', adminController.getLogin);
router.post('/login', adminController.postLogin);
router.get('/logout', adminController.logout);


// ---------- DASHBOARD ----------
router.get('/dashboard', ensureAdmin, adminController.getDashboard);


// ---------- PRODUCTS ----------
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

router.post(
  '/products/delete/:id',
  ensureAdmin,
  adminController.deleteProduct
);


// ---------- WORKSHOPS ----------
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

router.post(
  '/workshops/delete/:id',
  ensureAdmin,
  adminController.deleteWorkshop
);


module.exports = router;