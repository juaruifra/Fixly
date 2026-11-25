import mongoose from "mongoose";
import { normalizeCatalogSearchText } from "../utils/catalog-search.util.js";

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    description: { type: String, trim: true, maxlength: 500 },
    searchText: { type: String, select: false },
    active: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["draft", "published", "paused", "discontinued"],
      default: "published",
    },
    slug: { type: String, required: true, unique: true, sparse: true },
  },
  { timestamps: true },
);

// Los inserts documentales mantienen el mismo índice lógico que el CRUD.
serviceSchema.pre("validate", function () {
  this.searchText = normalizeCatalogSearchText(this.name, this.description);
});

export const Service = mongoose.model("Service", serviceSchema);
