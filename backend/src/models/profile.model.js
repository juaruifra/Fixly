import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    creationKey: { type: String, select: false },
  },
  { timestamps: true },
);

profileSchema.index({ owner: 1, createdAt: -1 });
profileSchema.index(
  { owner: 1, creationKey: 1 },
  {
    unique: true,
    partialFilterExpression: { creationKey: { $type: "string" } },
  },
);

export const Profile = mongoose.model("Profile", profileSchema);