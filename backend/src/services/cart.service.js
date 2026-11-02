import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

import { cartRepository } from "../repositories/cart.repository.js";
import { orderRepository } from "../repositories/order.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { variantRepository } from "../repositories/variant.repository.js";
import { AppError } from "../utils/app-error.js";

function validateObjectId(id, label) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new AppError(`Invalid ${label} id`, 400);
  }
}

function validateQuantity(quantity) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new AppError("quantity must be a positive integer", 400);
  }
}

async function getActiveUserOrThrow(userId) {
  validateObjectId(userId, "user");
  const user = await userRepository.findById(userId);
  if (!user || !user.active || user.deletedAt != null) {
    throw new AppError("User not found", 404);
  }
  return user;
}

async function getCartOrCreate(userId) {
  let cart = await cartRepository.findByUser(userId);
  if (!cart) {
    await cartRepository.createForUser(userId);
    cart = await cartRepository.findByUser(userId);
  }
  if (!cart) throw new AppError("Cart could not be created", 500);
  return cart;
}

function assertVariantAvailable(variant) {
  const service = variant?.service;
  const category = service?.category;
  if (!variant || variant.deletedAt != null || !variant.active || variant.status !== "published") {
    throw new AppError("Variant is not available", 409);
  }
  if (!service || service.deletedAt != null || !service.active || service.status !== "published") {
    throw new AppError("Service is not available", 409);
  }
  if (!category || category.deletedAt != null || !category.active) {
    throw new AppError("Category is not available", 409);
  }
}

async function assertCheckoutUnlocked(userId) {
  if (await cartRepository.isCheckoutInProgress(userId)) {
    throw new AppError("Cart checkout is in progress; retry after it finishes", 409);
  }
}

export const cartService = {
  async get(userId) {
    await getActiveUserOrThrow(userId);
    return getCartOrCreate(userId);
  },
  async addVariant(userId, variantId, quantity = 1) {
    await getActiveUserOrThrow(userId);
    validateObjectId(variantId, "variant");
    validateQuantity(quantity);

    const variant = await variantRepository.findById(variantId);
    assertVariantAvailable(variant);

    await getCartOrCreate(userId);
    await assertCheckoutUnlocked(userId);
    const updated = await cartRepository.addVariant(userId, variantId, quantity);
    if (!updated) throw new AppError("Cart changed; retry the request", 409);
    return cartRepository.findByUser(userId);
  },
  async setQuantity(userId, variantId, quantity) {
    await getActiveUserOrThrow(userId);
    validateObjectId(variantId, "variant");
    validateQuantity(quantity);

    const variant = await variantRepository.findById(variantId);
    assertVariantAvailable(variant);
    await getCartOrCreate(userId);
    await assertCheckoutUnlocked(userId);
    const updated = await cartRepository.setQuantity(userId, variantId, quantity);
    if (!updated) throw new AppError("Variant is not in the cart", 404);
    return cartRepository.findByUser(userId);
  },
  async removeVariant(userId, variantId) {
    await getActiveUserOrThrow(userId);
    validateObjectId(variantId, "variant");
    await getCartOrCreate(userId);
    await assertCheckoutUnlocked(userId);
    const updated = await cartRepository.removeVariant(userId, variantId);
    if (!updated) throw new AppError("Cart not found", 404);
    return cartRepository.findByUser(userId);
  },
  async clear(userId) {
    await getActiveUserOrThrow(userId);
    await getCartOrCreate(userId);
    await assertCheckoutUnlocked(userId);
    await cartRepository.clear(userId);
    return cartRepository.findByUser(userId);
  },
  async checkout(userId) {
    await getActiveUserOrThrow(userId);
    let cart = await getCartOrCreate(userId);
    if (cart.items.length === 0) throw new AppError("Cart is empty", 409);

    // El token permite reconocer un reintento si el proceso cae tras crear el pedido.
    let checkoutToken = cart.checkoutToken;
    if (!checkoutToken) {
      checkoutToken = randomUUID();
      const claimed = await cartRepository.claimCheckout(userId, checkoutToken);
      if (!claimed) {
        cart = await cartRepository.findByUserForCheckout(userId);
        if (!cart?.checkoutToken) {
          throw new AppError("Cart changed; retry the checkout", 409);
        }
        checkoutToken = cart.checkoutToken;
      }
    }

    const previousOrder = await orderRepository.findByCheckoutToken(checkoutToken);
    if (previousOrder) {
      await cartRepository.clearAfterCheckout(userId, checkoutToken);
      return previousOrder;
    }

    try {
      cart = await cartRepository.findByUserForCheckout(userId);
      if (!cart || cart.items.length === 0) throw new AppError("Cart is empty", 409);

      // Copiamos los datos actuales para que el pedido no cambie si luego editan la variante.
      const items = cart.items.map(({ variant, quantity }) => {
        assertVariantAvailable(variant);
        const priceInCents = Math.round(variant.price * 100);
        const subtotal = (priceInCents * quantity) / 100;
        return {
          variant: variant._id,
          sku: variant.sku,
          serviceName: variant.service.name,
          variantName: variant.name,
          price: priceInCents / 100,
          duration: variant.duration,
          quantity,
          subtotal,
        };
      });
      const totalInCents = items.reduce(
        (sum, item) => sum + Math.round(item.subtotal * 100),
        0,
      );
      const total = totalInCents / 100;

      let order;
      try {
        order = await orderRepository.create({
          user: userId,
          items,
          total,
          status: "pending",
          checkoutToken,
        });
      } catch (error) {
        if (error?.code !== 11000) throw error;
        order = await orderRepository.findByCheckoutToken(checkoutToken);
        if (!order) throw error;
      }

      await cartRepository.clearAfterCheckout(userId, checkoutToken);
      return order;
    } catch (error) {
      // Si falló antes de crear el pedido, el carrito vuelve a estar disponible.
      const existingOrder = await orderRepository.findByCheckoutToken(checkoutToken);
      if (!existingOrder) {
        await cartRepository.releaseCheckout(userId, checkoutToken);
      }
      throw error;
    }
  },
};
