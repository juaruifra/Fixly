import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ["category", "service", "variant", "profile"],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    alt: { type: String, required: true, trim: true, maxlength: 250 },
  },
  { timestamps: true },
);

// La relación polimórfica permite varias imágenes por entidad.
imageSchema.index(
  { entityType: 1, entityId: 1, createdAt: 1 },
  { name: "entityType_entityId_createdAt_idx" },
);
imageSchema.index(
  { entityType: 1, entityId: 1 },
  {
    name: "one_avatar_per_profile_idx",
    unique: true,
    partialFilterExpression: { entityType: "profile" },
  },
);

export const Image = mongoose.model("Image", imageSchema);