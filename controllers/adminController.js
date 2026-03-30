const Product = require('../models/Product');
const Workshop = require('../models/Workshop');
const cloudinary = require('../config/cloudinary');

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

function getUploadedImageData(file) {
  if (!file) return null;
  return {
    imageUrl: file.secure_url || file.path || null,
    imagePublicId: file.filename || file.public_id || null
  };
}

async function removeCloudinaryImage(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (error) {
    console.error('Failed to delete old Cloudinary image:', error.message || error);
  }
}

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


// ---------- PRODUCTS ----------
exports.listProducts = async (req, res) => {

  const products = await Product.find().sort({ createdAt: -1 });

  res.render('admin/products', {
    products,
    categoryLabelFromSlug
  });

};


exports.getProductForm = async (req, res) => {

  const product = req.params.id
    ? await Product.findById(req.params.id)
    : null;

  res.render('admin/product-form', {
    product,
    fixedCategories: FIXED_CATEGORIES
  });

};


exports.postProduct = async (req, res) => {

  try {

    const { name, price, categorySlug, description } = req.body;

    const uploaded = getUploadedImageData(req.file);

    await Product.create({
      name,
      price,
      categorySlug,
      description,
      imageUrl: uploaded ? uploaded.imageUrl : null,
      imagePublicId: uploaded ? uploaded.imagePublicId : null
    });

    res.redirect('/admin/products');

  } catch (error) {

    console.error(error);
    res.status(500).send('Internal Server Error');

  }

};


exports.updateProduct = async (req, res) => {

  try {

    const { id } = req.params;
    const { name, price, categorySlug, description } = req.body;

    const product = await Product.findById(id);

    if (!product) return res.redirect('/admin/products');

    const updateData = {
      name,
      price,
      categorySlug,
      description
    };

    if (req.file) {
      const uploaded = getUploadedImageData(req.file);
      updateData.imageUrl = uploaded ? uploaded.imageUrl : null;
      updateData.imagePublicId = uploaded ? uploaded.imagePublicId : null;
      await removeCloudinaryImage(product.imagePublicId);
    }

    await Product.findByIdAndUpdate(id, updateData);

    res.redirect('/admin/products');

  } catch (error) {

    console.error(error);
    res.status(500).send('Internal Server Error');

  }

};


exports.deleteProduct = async (req, res) => {

  const { id } = req.params;

  const product = await Product.findById(id);
  if (product) {
    await removeCloudinaryImage(product.imagePublicId);
    await Product.findByIdAndDelete(id);
  }

  res.redirect('/admin/products');

};



// ---------- WORKSHOPS ----------
exports.listWorkshops = async (req, res) => {

  const workshops = await Workshop.find().sort({ createdAt: -1 });

  res.render('admin/workshops', { workshops });

};


exports.getWorkshopForm = async (req, res) => {

  const workshop = req.params.id
    ? await Workshop.findById(req.params.id)
    : null;

  if (req.params.id && !workshop) {
    return res.redirect('/admin/workshops');
  }

  res.render('admin/workshop-form', { workshop });

};


exports.postWorkshop = async (req, res) => {

  try {

    const { title, description, date, time, price } = req.body;

    if (!req.file) {
      return res.status(400).send('Image is required for a new workshop.');
    }

    const uploaded = getUploadedImageData(req.file);

    const scheduleAt = buildWorkshopScheduleAt(date, time);

    await Workshop.create({
      title,
      description,
      date,
      time: time || '',
      scheduleAt,
      price: Number(price),
      imageUrl: uploaded ? uploaded.imageUrl : null,
      imagePublicId: uploaded ? uploaded.imagePublicId : null
    });

    res.redirect('/admin/workshops');

  } catch (error) {

    console.error(error);
    res.status(500).send('Internal Server Error');

  }

};


exports.updateWorkshop = async (req, res) => {

  try {

    const { id } = req.params;
    const { title, description, date, time, price } = req.body;

    const workshop = await Workshop.findById(id);

    if (!workshop) return res.redirect('/admin/workshops');

    const updateData = {
      title,
      description,
      date,
      time: time || '',
      scheduleAt: buildWorkshopScheduleAt(date, time),
      price: Number(price)
    };

    if (req.file) {
      const uploaded = getUploadedImageData(req.file);
      updateData.imageUrl = uploaded ? uploaded.imageUrl : null;
      updateData.imagePublicId = uploaded ? uploaded.imagePublicId : null;
      await removeCloudinaryImage(workshop.imagePublicId);
    }

    await Workshop.findByIdAndUpdate(id, updateData);

    res.redirect('/admin/workshops');

  } catch (error) {

    console.error(error);
    res.status(500).send('Internal Server Error');

  }

};


exports.deleteWorkshop = async (req, res) => {

  const { id } = req.params;

  const workshop = await Workshop.findById(id);
  if (workshop) {
    await removeCloudinaryImage(workshop.imagePublicId);
    await Workshop.findByIdAndDelete(id);
  }

  res.redirect('/admin/workshops');

};