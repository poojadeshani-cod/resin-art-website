const Product = require('../models/Product');
const Workshop = require('../models/Workshop');

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
  // dateStr comes from `<input type="date">` => YYYY-MM-DD
  // timeStr comes from `<input type="time">` => HH:mm
  if (!dateStr) return null;

  if (timeStr && /^\d{2}:\d{2}$/.test(timeStr)) {
    const dt = new Date(`${dateStr}T${timeStr}:00`);
    return isNaN(dt.getTime()) ? null : dt;
  }

  const dt = new Date(dateStr);
  return isNaN(dt.getTime()) ? null : dt;
}

// ---------- AUTH ----------

exports.getLogin = (req, res) => {
  res.render('admin/login', { error: null });
};

exports.postLogin = (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    req.session.isAdmin = true;
    return res.redirect('/admin/dashboard');
  }

  return res.render('admin/login', { error: 'Invalid credentials' });
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
};

// ---------- DASHBOARD ----------

exports.getDashboard = async (req, res) => {
  const productCount = await Product.countDocuments();
  const workshopCount = await Workshop.countDocuments();

  // Count products per fixed category
  const perCategoryRaw = await Product.aggregate([
    { $group: { _id: '$categorySlug', count: { $sum: 1 } } }
  ]);

  const perCategory = {};
  perCategoryRaw.forEach((row) => {
    perCategory[row._id] = row.count;
  });

  res.render('admin/dashboard', {
    productCount,
    workshopCount,
    fixedCategories: FIXED_CATEGORIES,
    perCategory
  });
};

// ---------- PRODUCTS CRUD (only fixed categories) ----------

exports.listProducts = async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });

  res.render('admin/products', {
    products,
    categoryLabelFromSlug
  });
};

exports.getProductForm = async (req, res) => {
  const { id } = req.params;

  let product = null;
  if (id) {
    product = await Product.findById(id);
  }

  res.render('admin/product-form', {
    product,
    fixedCategories: FIXED_CATEGORIES
  });
};

exports.postProduct = async (req, res) => {
  const { name, price, categorySlug, description } = req.body;
  let imageUrl = null;

  if (req.file) {
    imageUrl = '/uploads/' + req.file.filename;
  }

  await Product.create({
    name,
    price,
    categorySlug,
    description,
    imageUrl
  });

  res.redirect('/admin/products');
};

exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, price, categorySlug, description } = req.body;

  const updateData = {
    name,
    price,
    categorySlug,
    description
  };

  if (req.file) {
    updateData.imageUrl = '/uploads/' + req.file.filename;
  }

  await Product.findByIdAndUpdate(id, updateData);
  res.redirect('/admin/products');
};

exports.deleteProduct = async (req, res) => {
  const { id } = req.params;
  await Product.findByIdAndDelete(id);
  res.redirect('/admin/products');
};

// ---------- WORKSHOPS (separate from products / categories) ----------

exports.listWorkshops = async (req, res) => {
  const workshops = await Workshop.find().sort({ createdAt: -1 });
  res.render('admin/workshops', { workshops });
};

exports.getWorkshopForm = async (req, res) => {
  const { id } = req.params;
  let workshop = null;
  if (id) {
    workshop = await Workshop.findById(id);
    if (!workshop) {
      return res.redirect('/admin/workshops');
    }
  }
  res.render('admin/workshop-form', { workshop });
};

exports.postWorkshop = async (req, res) => {
  const { title, description, date, time, price } = req.body;
  let imageUrl = null;

  if (req.file) {
    imageUrl = '/uploads/' + req.file.filename;
  }

  if (!imageUrl) {
    return res.status(400).send('Image is required for a new workshop.');
  }

  const scheduleAt = buildWorkshopScheduleAt(date, time);

  await Workshop.create({
    title,
    description,
    date,
    time: time || '',
    scheduleAt,
    price: Number(price),
    imageUrl
  });

  res.redirect('/admin/workshops');
};

exports.updateWorkshop = async (req, res) => {
  const { id } = req.params;
  const { title, description, date, time, price } = req.body;

  const scheduleAt = buildWorkshopScheduleAt(date, time);

  const updateData = {
    title,
    description,
    date,
    time: time || '',
    scheduleAt,
    price: Number(price)
  };

  if (req.file) {
    updateData.imageUrl = '/uploads/' + req.file.filename;
  }

  await Workshop.findByIdAndUpdate(id, updateData);
  res.redirect('/admin/workshops');
};

exports.deleteWorkshop = async (req, res) => {
  const { id } = req.params;
  await Workshop.findByIdAndDelete(id);
  res.redirect('/admin/workshops');
};