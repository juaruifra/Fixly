import mongoose from "mongoose";

const allowedStatuses = ["pending", "confirmed", "cancelled", "completed"];

const orderItemSchema = new mongoose.Schema({
  variant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Variant",
    required: true,
    immutable: true,
  },
  sku: { type: String, required: true, immutable: true },
  serviceName: { type: String, required: true, immutable: true },
  variantName: { type: String, required: true, immutable: true },
  price: { type: Number, required: true, min: 0, immutable: true },
  duration: { type: Number, required: true, min: 1, immutable: true },
  quantity: { type: Number, required: true, min: 1, immutable: true },
  subtotal: { type: Number, required: true, min: 0, immutable: true },
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    items: { type: [orderItemSchema], required: true, immutable: true },
    total: { type: Number, required: true, min: 0, immutable: true },
    status: {
      type: String,
      enum: allowedStatuses,
      default: "pending",
    },
    // Token interno para que los reintentos de checkout no creen otro pedido.
    checkoutToken: { type: String, unique: true, sparse: true, select: false },
  },
  { timestamps: true },
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.set("toJSON", {
  transform(_document, result) {
    delete result.checkoutToken;
    return result;
  },
});

export { allowedStatuses as orderStatuses };
export const Order = mongoose.model("Order", orderSchema);
