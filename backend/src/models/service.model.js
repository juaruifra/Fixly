import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, required: true, trim: true, maxlength: 80 },
  price: { type: Number, required: true, min: 0 },
  duration: { type: Number, required: true, min: 15 },
  description: { type: String, trim: true, maxlength: 500 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export const Service = mongoose.model("Service", serviceSchema);
