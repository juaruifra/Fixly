import mongoose from "mongoose";

// Define los datos que MongoDB guarda para cada categoría.
// deletedAt permite marcarla como borrada sin eliminar el documento.
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    // El servicio genera este valor y MongoDB evita que se repita.
    slug: { type: String, required: true, unique: true, sparse: true },
    // Las categorías nuevas se pueden usar salvo que se desactiven.
    active: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  // Mongoose añade automáticamente createdAt y updatedAt.
  { timestamps: true },
);

export const Category = mongoose.model("Category", categorySchema);