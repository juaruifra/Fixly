import mongoose from "mongoose";
import { normalizeCatalogSearchText } from "../utils/catalog-search.util.js";

// Define los datos que MongoDB guarda para cada categoría.
// deletedAt permite marcarla como borrada sin eliminar el documento.
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    searchText: { type: String, select: false },
    // El servicio genera este valor y MongoDB evita que se repita.
    slug: { type: String, required: true, unique: true, sparse: true },
    // Las categorías nuevas se pueden usar salvo que se desactiven.
    active: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  // Mongoose añade automáticamente createdAt y updatedAt.
  { timestamps: true },
);

// Los inserts directos (por ejemplo, el seed) también deben crear el texto derivado.
categorySchema.pre("validate", function () {
  this.searchText = normalizeCatalogSearchText(this.name);
});

export const Category = mongoose.model("Category", categorySchema);