import mongoose from "mongoose";
import { serviceRepository } from "../repositories/service.repository.js";
import { AppError } from "../utils/app-error.js";
function validateId(id) { if (!mongoose.isValidObjectId(id)) throw new AppError("Invalid service id", 400); }
function sanitizeInput(data) { const allowed=["name","category","price","duration","description","active"]; return Object.fromEntries(Object.entries(data).filter(([key])=>allowed.includes(key))); }
export const serviceService = {
  list: () => serviceRepository.findAll(),
  async getById(id) { validateId(id); const item=await serviceRepository.findById(id); if(!item) throw new AppError("Service not found",404); return item; },
  create: (data) => serviceRepository.create(sanitizeInput(data)),
  async update(id,data) { validateId(id); const item=await serviceRepository.updateById(id,sanitizeInput(data)); if(!item) throw new AppError("Service not found",404); return item; },
  async remove(id) { validateId(id); const item=await serviceRepository.deleteById(id); if(!item) throw new AppError("Service not found",404); }
};
