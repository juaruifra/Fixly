import { apiService } from "@/services/apiService";

export async function getShopDetail(slug, signal) {
  const response = await apiService.get(`/shopDetail/services/${encodeURIComponent(slug)}`, { signal });
  return response.data;
}

export async function getShopVariants(slug, signal) {
  const response = await apiService.get(`/shopDetail/services/${encodeURIComponent(slug)}/variants`, { signal });
  return response.data;
}