require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const morgan = require("morgan");
const methodOverride = require("method-override");
const connectDB = require("./config/db");

const adminRoutes = require("./routes/admin");
const apiRoutes = require("./routes/api");
const Product = require("./models/Product");
const Workshop = require("./models/Workshop");

/** Display names for product category slugs (keep in sync with Product model + admin) */
const CATEGORY_LABELS = {
  "resin-jewelry": "Resin Jewellery",
  "resin-preservation": "Resin Preservation",
  interior: "Interior",
  "scented-candles": "Scented Candles"
};

function normalizeWhatsAppDigits(number) {
  return (number || "").replace(/\D/g, "");
}

/** Prefilled WhatsApp message for a workshop booking */
function buildWorkshopWhatsAppUrl(workshop, whatsappRaw) {
  const digits = normalizeWhatsAppDigits(whatsappRaw);
  if (!digits) return "";

  const whenLines = [];
  if (workshop.date) whenLines.push(`Date: ${workshop.date}`);
  if (workshop.time) whenLines.push(`Time: ${workshop.time}`);

  const whenText = whenLines.join('\n') || `Date: ${workshop.date || '-'}`;

  const text = `Hi! I'd like to book this workshop:\n\n"${workshop.title}"\n${whenText}\nPrice: ₹${Number(workshop.price).toFixed(2)}\n\nPlease confirm availability.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

const app = express();

// Connect Database
connectDB();

// View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(morgan("dev"));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "session_secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl:
        process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/resin_shop",
      collectionName: "sessions"
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);

// Ensure upload directory exists (multer → public/uploads)
const uploadsDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/admin", adminRoutes);
app.use("/api", apiRoutes);

// ---------------- CLIENT PAGES ----------------

// Home Page — single Workshops banner → /workshops (no workshop list on home)
app.get("/", (req, res) => {
  res.render("shop/home", {
    whatsappNumber: process.env.WHATSAPP_NUMBER || ""
  });
});

// Workshop index — full grid cards + WhatsApp Book Now
app.get("/workshops", async (req, res) => {
  try {
    const workshops = await Workshop.find().sort({ createdAt: -1 }).lean();
    const whatsappNumber = process.env.WHATSAPP_NUMBER || "";
    const whatsappUrls = {};
    workshops.forEach((w) => {
      whatsappUrls[w._id.toString()] = buildWorkshopWhatsAppUrl(w, whatsappNumber);
    });

    res.render("shop/workshops", {
      workshops,
      whatsappUrls,
      whatsappNumber
    });
  } catch (error) {
    console.error(error);
    res.redirect("/");
  }
});

// Single workshop — full details + WhatsApp booking
app.get("/workshops/:id", async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id).lean();
    if (!workshop) {
      return res.redirect("/workshops");
    }
    const whatsappNumber = process.env.WHATSAPP_NUMBER || "";
    const whatsappBookingUrl = buildWorkshopWhatsAppUrl(workshop, whatsappNumber);

    res.render("shop/workshop-detail", {
      workshop,
      whatsappNumber,
      whatsappBookingUrl
    });
  } catch (error) {
    console.error(error);
    res.redirect("/workshops");
  }
});

// Old URL → new listing
app.get("/workshop", (req, res) => {
  res.redirect(301, "/workshops");
});

// Category Page
app.get("/category/:slug", async (req, res) => {
  try {
    const slug = req.params.slug;

    const category = {
      slug,
      name: CATEGORY_LABELS[slug] || slug.replace(/-/g, " ")
    };

    const products = await Product.find({ categorySlug: slug }).sort({
      createdAt: -1
    });

    res.render("shop/category", {
      category,
      products,
      whatsappNumber: process.env.WHATSAPP_NUMBER || ""
    });
  } catch (error) {
    console.error(error);
    res.redirect("/");
  }
});

// Product Detail Page
app.get("/product/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.redirect("/");
    }

    res.render("shop/product", {
      product,
      categoryLabel:
        CATEGORY_LABELS[product.categorySlug] || product.categorySlug || "",
      whatsappNumber: process.env.WHATSAPP_NUMBER || ""
    });
  } catch (error) {
    console.error(error);
    res.redirect("/");
  }
});

// Cart Page
app.get("/cart", (req, res) => {
  res.render("shop/cart", {
    whatsappNumber: process.env.WHATSAPP_NUMBER || ""
  });
});

// -------- Auto-delete expired workshops --------
async function cleanupExpiredWorkshops() {
  try {
    const now = new Date();
    const result = await Workshop.deleteMany({
      scheduleAt: { $ne: null, $lte: now }
    });

    if (result && result.deletedCount) {
      console.log(`[workshops] Auto-deleted ${result.deletedCount} expired workshop(s).`);
    }
  } catch (err) {
    console.error("[workshops] Auto-delete failed:", err);
  }
}

function startWorkshopAutoDeleteJob() {
  // Runs periodically to remove workshops as soon as their date+time passes.
  const intervalMs = 30000; // 30 seconds
  cleanupExpiredWorkshops();
  setInterval(cleanupExpiredWorkshops, intervalMs);
}

startWorkshopAutoDeleteJob();

// 404
app.use((req, res) => {
  res.status(404).send("Not found");
});

// Server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});