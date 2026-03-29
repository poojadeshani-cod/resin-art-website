const Product = require('../models/Product');
const Workshop = require('../models/Workshop');
const fs = require('fs');
const path = require('path');

// Fixed category definitions
const FIXED_CATEGORIES = [
  { slug: 'resin-jewelry', label: 'Resin Jewellery' },
  { slug: 'resin-preservation', label: 'Resin Preservation' },
  { slug: 'interior', label: 'Interior' },
  { slug: 'scented-candles', label: 'Scented Candles' }
];

const categoryLabelFromSlug = (slug) => {
  const found = FIXED_CATEGORIES.find((c) => c.slug === slug);
  return found ? found.label : slug || '';
};

function buildWorkshopScheduleAt(dateStr, timeStr) {
  if (!dateStr) return null;
  if (timeStr && /^\d{2}:\d{2}$/.test(timeStr)) {
    const dt = new Date(`${dateStr}T${timeStr}:00`);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(dateStr);
  return isNaN(dt.getTime()) ? null : dt;
}

// ---------- AUTH ----------
exports.getLogin = (req, res) => res.render('admin/login', { error: null });

exports.postLogin = (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect('/admin/dashboard');
  }
  return res.render('admin/login', { error: 'Invalid credentials' });
};

exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
};

// ---------- DASHBOARD ----------
exports.getDashboard = async (req, res) => {
  const productCount = await Product.countDocuments();
  const workshopCount = await Workshop.countDocuments();

  const perCategoryRaw = await Product.aggregate([{ $group: { _id: '$categorySlug', count: { $sum: 1 } } }]);
  const perCategory = {};
  perCategoryRaw.forEach((row) => perCategory[row._id] = row.count);

  res.render('admin/dashboard', { productCount, workshopCount, fixedCategories: FIXED_CATEGORIES, perCategory });
};

// ---------- PRODUCTS CRUD ----------
exports.listProducts = async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.render('admin/products', { products, categoryLabelFromSlug });
};

exports.getProductForm = async (req, res) => {
  const product = req.params.id ? await Product.findById(req.params.id) : null;
  res.render('admin/product-form', { product, fixedCategories: FIXED_CATEGORIES });
};

exports.postProduct = async (req, res) => {
  const { name, price, categorySlug, description } = req.body;
  let imageUrl = null;

  if (req.file) imageUrl = '/uploads/' + req.file.filename;

  await Product.create({ name, price, categorySlug, description, imageUrl });
  res.redirect('/admin/products');
};

exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, price, categorySlug, description } = req.body;

  const product = await Product.findById(id);
  if (!product) return res.redirect('/admin/products');

  const updateData = { name, price, categorySlug, description };

  if (req.file) {
    // Delete old image
    if (product.imageUrl) {
      const oldPath = path.join(__dirname, '..', 'public', product.imageUrl);
      fs.unlink(oldPath, () => {});
    }
    updateData.imageUrl = '/uploads/' + req.file.filename;
  }

  await Product.findByIdAndUpdate(id, updateData);
  res.redirect('/admin/products');
};

exports.deleteProduct = async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id);
  if (product?.imageUrl) fs.unlink(path.join(__dirname, '..', 'public', product.imageUrl), () => {});
  await Product.findByIdAndDelete(id);
  res.redirect('/admin/products');
};

// ---------- WORKSHOPS ----------
exports.listWorkshops = async (req, res) => {
  const workshops = await Workshop.find().sort({ createdAt: -1 });
  res.render('admin/workshops', { workshops });
};

exports.getWorkshopForm = async (req, res) => {
  const workshop = req.params.id ? await Workshop.findById(req.params.id) : null;
  if (req.params.id && !workshop) return res.redirect('/admin/workshops');
  res.render('admin/workshop-form', { workshop });
};

exports.postWorkshop = async (req, res) => {
  const { title, description, date, time, price } = req.body;
  if (!req.file) return res.status(400).send('Image is required for a new workshop.');

  const imageUrl = '/uploads/' + req.file.filename;
  const scheduleAt = buildWorkshopScheduleAt(date, time);

  await Workshop.create({ title, description, date, time: time || '', scheduleAt, price: Number(price), imageUrl });
  res.redirect('/admin/workshops');
};

exports.updateWorkshop = async (req, res) => {
  const { id } = req.params;
  const { title, description, date, time, price } = req.body;

  const workshop = await Workshop.findById(id);
  if (!workshop) return res.redirect('/admin/workshops');

  const updateData = { title, description, date, time: time || '', scheduleAt: buildWorkshopScheduleAt(date, time), price: Number(price) };

  if (req.file) {
    if (workshop.imageUrl) fs.unlink(path.join(__dirname, '..', 'public', workshop.imageUrl), () => {});
    updateData.imageUrl = '/uploads/' + req.file.filename;
  }

  await Workshop.findByIdAndUpdate(id, updateData);
  res.redirect('/admin/workshops');
};

exports.deleteWorkshop = async (req, res) => {
  const { id } = req.params;
  const workshop = await Workshop.findById(id);
  if (workshop?.imageUrl) fs.unlink(path.join(__dirname, '..', 'public', workshop.imageUrl), () => {});
  await Workshop.findByIdAndDelete(id);
  res.redirect('/admin/workshops');
};