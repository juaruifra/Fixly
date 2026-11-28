import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckIcon, ChevronDownIcon, CircleUserRoundIcon, KeyRoundIcon, LogOutIcon, UsersIcon } from "lucide-react";

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
import { showApiErrorAlert } from "@/utils/errorHandler";

// Permite cambiar la preferencia del usuario sin convertir el perfil en otra cuenta.
export default function ProfileSelector() {
  const { user, signOut, isLoggingOut } = useAuth();
  const navigate = useNavigate();
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

  async function handleSignOut() {
    setOpen(false);
    try {
      await signOut();
      navigate("/", { replace: true });
    } catch (error) {
      await showApiErrorAlert(error, "No se pudo cerrar la sesión en el servidor");
    }
  }

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
            className="navbar-profile-trigger"
            variant="ghost"
            aria-label="Abrir menú personal"
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
        className="navbar-profile-menu"
        side="bottom"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link to="/account" />}><CircleUserRoundIcon aria-hidden="true" /> Mi cuenta</DropdownMenuItem>
          <DropdownMenuItem render={<Link to="/account/profiles" />}><UsersIcon aria-hidden="true" /> Mis perfiles</DropdownMenuItem>
          <DropdownMenuItem render={<Link to="/account/password" />}><KeyRoundIcon aria-hidden="true" /> Contraseña</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Perfil predeterminado</DropdownMenuLabel>
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
        <DropdownMenuItem disabled={isLoggingOut} onClick={handleSignOut}>
          <LogOutIcon aria-hidden="true" />
          {isLoggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}