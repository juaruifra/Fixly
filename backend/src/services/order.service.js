import mongoose from "mongoose";

import { orderRepository } from "../repositories/order.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/app-error.js";
import { orderStatuses } from "../models/order.model.js";

const allowedTransitions = {
// Limita los cambios para que el ciclo del pedido avance de forma coherente.
  pending: ["confirmed", "cancelled"],
  confirmed: ["cancelled", "completed"],
  cancelled: [],
  completed: [],
};

function validateId(id, label) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new AppError(`Invalid ${label} id`, 400);
  }
}

async function getActiveUserOrThrow(userId) {
  validateId(userId, "user");
  const user = await userRepository.findById(userId);
  if (!user || !user.active || user.deletedAt != null) {
    throw new AppError("User not found", 404);
  }
  return user;
}

async function getOrderOrThrow(orderId) {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new AppError("Order not found", 404);
  return order;
}

export const orderService = {
  async listForUser(userId) {
    await getActiveUserOrThrow(userId);
    return orderRepository.findByUser(userId);
  },
  async listAll(filters = {}) {
    if (filters.status !== undefined && !orderStatuses.includes(filters.status)) {
      throw new AppError("Invalid order status", 400);
    }
    if (filters.user !== undefined) validateId(filters.user, "user");
    return orderRepository.findAll(filters);
  },
  async getById(orderId, requester) {
    validateId(orderId, "order");
    const order = await getOrderOrThrow(orderId);
    if (requester.role !== "ADMIN" && String(order.user) !== String(requester.id)) {
      throw new AppError("Order not found", 404);
    }
    return order;
  },
  async setStatus(orderId, status) {
    validateId(orderId, "order");
    if (!orderStatuses.includes(status)) {
      throw new AppError("Invalid order status", 400);
    }
    const order = await getOrderOrThrow(orderId);
    if (!allowedTransitions[order.status].includes(status)) {
      throw new AppError(`Cannot change order status from ${order.status} to ${status}`, 409);
    }
    const updated = await orderRepository.updateStatusById(orderId, status);
    if (!updated) throw new AppError("Order not found", 404);
    return updated;
  },
};
