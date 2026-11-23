import { useProfilesContext } from "@/providers/ProfilesProvider";

// Da acceso al estado común de perfiles desde la barra lateral y sus páginas.
export function useProfiles() {
  return useProfilesContext();
}