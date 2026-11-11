import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ["category", "service", "variant"],
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
imageSchema.index({ entityType: 1, entityId: 1 });

export const Image = mongoose.model("Image", imageSchema);