import { apiService } from "@/services/apiService";

export async function getHomeCategories(signal) {
  const response = await apiService.get("/home/categories", { signal });
  return response.data;
}