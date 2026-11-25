import { apiService } from "@/services/apiService";

export async function getShopServices(params, signal) {
  const response = await apiService.get("/shop/services", { params, signal });
  return response.data;
}

export async function getShopFilters(params, signal) {
  const response = await apiService.get("/shop/filters", { params, signal });
  return response.data;
}