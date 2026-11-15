import { apiService } from "@/services/apiService";

const PROFILES_PATH = "/profiles";

export async function getProfiles() {
  const { data } = await apiService.get(PROFILES_PATH);
  return data;
}

export async function createProfile(profileData) {
  const { data } = await apiService.post(PROFILES_PATH, profileData);
  return data;
}

export async function updateProfile(id, profileData) {
  const { data } = await apiService.patch(
    `${PROFILES_PATH}/${encodeURIComponent(id)}`,
    profileData,
  );
  return data;
}

export async function deleteProfile(id) {
  await apiService.delete(`${PROFILES_PATH}/${encodeURIComponent(id)}`);
}