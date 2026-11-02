import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variant",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isInteger,
    },
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: { type: [cartItemSchema], default: [] },
    // Reserva el checkout para recuperar un pedido si falla el vaciado del carrito.
    checkoutToken: { type: String, default: null, select: false },
  },
  { timestamps: true },
);

export const Cart = mongoose.model("Cart", cartSchema);
