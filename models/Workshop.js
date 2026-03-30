const mongoose = require('mongoose');

/**
 * Workshops are separate from product categories — managed in /admin/workshops.
 * createdAt / updatedAt come from { timestamps: true }.
 */
const WorkshopSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    // Kept as string for display purposes (admin input `type="date"` -> YYYY-MM-DD)
    date: { type: String, required: true, trim: true },
    // Admin input `type="time"` -> HH:mm
    time: { type: String, trim: true, default: "" },
    // Used for efficient expiration queries (auto-delete after this datetime).
    scheduleAt: { type: Date, default: null },
    price: { type: Number, required: true, min: 0 },
    imageUrl: { type: String },
    imagePublicId: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Workshop', WorkshopSchema);
