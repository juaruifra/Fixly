import ProfileManager from "@/features/profiles/components/ProfileManager";

// Mantiene la gestión existente de perfiles en una pantalla independiente.
export default function AccountProfiles() {
  return (
    <main className="account-page account-page-wide">
      <ProfileManager />
    </main>
  );
}