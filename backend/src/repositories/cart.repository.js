import { Cart } from "../models/cart.model.js";

const variantFields = "service name sku price duration active status requiresBooking deletedAt";
const serviceFields = "name slug active status deletedAt";
const categoryFields = "name slug active deletedAt";

function populateItems(query) {
  return query.populate({
    path: "items.variant",
    select: variantFields,
    populate: {
      path: "service",
      select: serviceFields,
      populate: { path: "category", select: categoryFields },
    },
  });
}

export const cartRepository = {
  findByUser: (userId) => populateItems(Cart.findOne({ user: userId })).lean(),
  isCheckoutInProgress: (userId) =>
    Cart.exists({ user: userId, checkoutToken: { $ne: null } }),
  findByUserForCheckout: (userId) =>
    populateItems(Cart.findOne({ user: userId }).select("+checkoutToken")).lean(),
  createForUser: async (userId) => {
    try {
      return await Cart.create({ user: userId, items: [] });
    } catch (error) {
      if (error?.code !== 11000) throw error;
      return Cart.findOne({ user: userId }).lean();
    }
  },
  addVariant: async (userId, variantId, quantity) => {
    const incremented = await Cart.findOneAndUpdate(
      { user: userId, checkoutToken: null, "items.variant": variantId },
      { $inc: { "items.$.quantity": quantity } },
      { new: true, runValidators: true },
    );
    if (incremented) return incremented;

    const inserted = await Cart.findOneAndUpdate(
      {
        user: userId,
        checkoutToken: null,
        items: { $not: { $elemMatch: { variant: variantId } } },
      },
      { $push: { items: { variant: variantId, quantity } } },
      { new: true, runValidators: true },
    );
    if (inserted) return inserted;

    // Otra petición pudo añadir la misma variante entre las dos consultas.
    return Cart.findOneAndUpdate(
      { user: userId, checkoutToken: null, "items.variant": variantId },
      { $inc: { "items.$.quantity": quantity } },
      { new: true, runValidators: true },
    );
  },
  setQuantity: (userId, variantId, quantity) =>
    Cart.findOneAndUpdate(
      { user: userId, checkoutToken: null, "items.variant": variantId },
      { $set: { "items.$.quantity": quantity } },
      { new: true, runValidators: true },
    ),
  removeVariant: (userId, variantId) =>
    Cart.findOneAndUpdate(
      { user: userId, checkoutToken: null },
      { $pull: { items: { variant: variantId } } },
      { new: true, runValidators: true },
    ),
  clear: (userId) =>
    Cart.findOneAndUpdate(
      { user: userId },
      { $set: { items: [], checkoutToken: null } },
      { new: true, runValidators: true },
    ),
  claimCheckout: (userId, token) =>
    Cart.findOneAndUpdate(
      { user: userId, checkoutToken: null },
      { $set: { checkoutToken: token } },
      { new: true },
    ).select("+checkoutToken"),
  clearAfterCheckout: (userId, token) =>
    Cart.findOneAndUpdate(
      { user: userId, checkoutToken: token },
      { $set: { items: [], checkoutToken: null } },
      { new: true, runValidators: true },
    ),
  releaseCheckout: (userId, token) =>
    Cart.findOneAndUpdate(
      { user: userId, checkoutToken: token },
      { $set: { checkoutToken: null } },
      { new: true },
    ),
};
