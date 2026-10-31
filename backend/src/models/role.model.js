import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 60,
      unique: true,
    },
    description: { type: String, trim: true, maxlength: 250 },
    active: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Role = mongoose.model("Role", roleSchema);
