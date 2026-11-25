import mongoose from "mongoose";
import { normalizeCatalogSearchText } from "../utils/catalog-search.util.js";

const variantSchema = new mongoose.Schema(
  {
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    searchText: { type: String, select: false },
    sku: { type: String, required: true, unique: true, trim: true },
    auto: { type: Boolean, default: true },
    price: { type: Number, required: true, min: 0 },
    duration: { type: Number, required: true, min: 1 },
    active: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["draft", "published", "paused", "discontinued"],
      default: "published",
    },
    requiresBooking: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Normaliza el nombre y la descripción también en altas directas de Mongoose.
variantSchema.pre("validate", function () {
  this.searchText = normalizeCatalogSearchText(this.name, this.description);
});

variantSchema.index({ service: 1, active: 1, status: 1, deletedAt: 1 });

export const Variant = mongoose.model("Variant", variantSchema);