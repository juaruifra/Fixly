import { Order } from "../models/order.model.js";

export const orderRepository = {
  create: (data) => Order.create(data),
  findById: (id) => Order.findById(id).lean(),
  findByCheckoutToken: (checkoutToken) =>
    Order.findOne({ checkoutToken }).lean(),
  findByUser: (userId) => Order.find({ user: userId }).sort({ createdAt: -1 }).lean(),
  findAll: (filters = {}) => {
    const query = {};
    if (filters.user !== undefined) query.user = filters.user;
    if (filters.status !== undefined) query.status = filters.status;
    return Order.find(query).sort({ createdAt: -1 }).lean();
  },
  updateStatusById: (id, status) =>
    Order.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, runValidators: true },
    ).lean(),
};
