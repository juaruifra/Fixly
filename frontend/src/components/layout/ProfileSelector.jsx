import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckIcon, ChevronDownIcon, CircleUserRoundIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/AuthProvider";
import { useProfiles } from "@/hooks/useProfiles";

// Permite cambiar la preferencia del usuario sin convertir el perfil en otra cuenta.
export default function ProfileSelector() {
  const { user } = useAuth();
  const {
    profiles,
    defaultProfileId,
    loading,
    submitting,
    error,
    selectDefaultProfile,
  } = useProfiles();
  const [open, setOpen] = useState(false);
  const selectedProfile = profiles.find((profile) => profile.id === defaultProfileId);

  async function selectProfile(profileId) {
    const saved = await selectDefaultProfile(profileId);
    if (saved) setOpen(false);
  }

  function ProfileAvatar({ profile }) {
    return profile?.avatar?.url ? (
      <img
        className="sidebar-profile-avatar"
        src={profile.avatar.url}
        alt={profile.avatar.alt || ""}
      />
    ) : (
      <CircleUserRoundIcon className="sidebar-profile-avatar-placeholder" aria-hidden="true" />
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            className="sidebar-profile-trigger"
            variant="ghost"
            disabled={loading}
            aria-label="Seleccionar perfil predeterminado"
          />
        }
      >
        <ProfileAvatar profile={selectedProfile} />
        <span className="sidebar-profile-copy">
          <strong>{user?.name}</strong>
          <span>{selectedProfile?.name || "Sin perfil seleccionado"}</span>
        </span>
        <ChevronDownIcon className="sidebar-profile-chevron" aria-hidden="true" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="sidebar-profile-menu"
        side="top"
        align="start"
        sideOffset={8}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>Perfiles</DropdownMenuLabel>
          {loading ? (
            <DropdownMenuItem disabled>Cargando perfiles…</DropdownMenuItem>
          ) : profiles.length === 0 ? (
            <DropdownMenuItem disabled>Aún no tienes perfiles</DropdownMenuItem>
          ) : (
            profiles.map((profile) => (
              <DropdownMenuItem
                key={profile.id}
                disabled={submitting}
                onClick={(event) => {
                  event.preventDefault();
                  void selectProfile(profile.id);
                }}
              >
                <ProfileAvatar profile={profile} />
                <span className="sidebar-profile-option-name">{profile.name}</span>
                {profile.id === defaultProfileId && <CheckIcon aria-hidden="true" />}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
        <DropdownMenuItem
          disabled={loading || submitting || defaultProfileId === null}
          onClick={(event) => {
            event.preventDefault();
            void selectProfile(null);
          }}
        >
          <CircleUserRoundIcon aria-hidden="true" />
          Sin perfil predeterminado
          {defaultProfileId === null && <CheckIcon aria-hidden="true" />}
        </DropdownMenuItem>
        {error && <p className="sidebar-profile-error" role="alert">{error}</p>}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link to="/account/profiles" />}>
          Gestionar perfiles
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}