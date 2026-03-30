
const express = require('express');
const { ensureAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const router = express.Router();

const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
];

// ---------- CLOUDINARY STORAGE ----------
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => ({
    folder: 'resin-shop',
    resource_type: 'image',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    public_id: `${Date.now()}-${file.originalname
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .toLowerCase()}`
  })
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, and WEBP images are allowed.'));
    }
    cb(null, true);
  }
});

const handleUpload = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (error) => {
    if (!error) return next();

    const message =
      error && error.message
        ? error.message
        : 'Image upload failed. Please try again.';
    return res.status(400).send(message);
  });
};


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
  handleUpload('image'),
  adminController.postProduct
);

router.get('/products/edit/:id', ensureAdmin, adminController.getProductForm);

router.post(
  '/products/edit/:id',
  ensureAdmin,
  handleUpload('image'),
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
  handleUpload('image'),
  adminController.postWorkshop
);

router.get('/workshops/edit/:id', ensureAdmin, adminController.getWorkshopForm);

router.post(
  '/workshops/edit/:id',
  ensureAdmin,
  handleUpload('image'),
  adminController.updateWorkshop
);

router.post(
  '/workshops/delete/:id',
  ensureAdmin,
  adminController.deleteWorkshop
);


module.exports = router;

