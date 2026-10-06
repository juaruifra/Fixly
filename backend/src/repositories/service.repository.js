import { Service } from "../models/service.model.js";
export const serviceRepository = {
  findAll: () => Service.find().sort({ createdAt: -1 }).lean(),
  findById: (id) => Service.findById(id).lean(),
  create: (data) => Service.create(data),
  updateById: (id, data) => Service.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean(),
  deleteById: (id) => Service.findByIdAndDelete(id)
};
