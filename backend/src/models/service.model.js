import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    description: { type: String, trim: true, maxlength: 500 },
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

export const Service = mongoose.model("Service", serviceSchema);
