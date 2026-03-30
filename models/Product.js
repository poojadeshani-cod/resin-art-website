const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    imageUrl: { type: String },
    imagePublicId: { type: String },
    description: { type: String },

    // Product categories only (Workshop bookings are separate — see Workshop model)
    categorySlug: {
      type: String,
      required: true,
      enum: ['resin-jewelry', 'resin-preservation', 'interior', 'scented-candles']
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', ProductSchema);