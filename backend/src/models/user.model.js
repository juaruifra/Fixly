import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    active: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Evita exponer el hash incluso si alguien serializa el documento directamente.
userSchema.set("toJSON", {
  transform(_document, result) {
    delete result.passwordHash;
    return result;
  },
});

export const User = mongoose.model("User", userSchema);
