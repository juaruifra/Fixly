import ProfileManager from "@/features/profiles/components/ProfileManager";

// Mantiene la gestión existente de perfiles en una pantalla independiente.
export default function AccountProfiles() {
  return (
    <div className="account-page account-page-wide">
      <ProfileManager />
    </div>
  );
}