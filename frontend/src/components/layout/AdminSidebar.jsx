import { Link } from "react-router-dom";
import {
  BriefcaseIcon,
  CircleUserRoundIcon,
  KeyRoundIcon,
  LayersIcon,
  LogOutIcon,
  ShieldCheckIcon,
  SunIcon,
  TagIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react";

import ThemeSelector from "@/components/ThemeSelector";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuLink,
} from "@/components/ui/sidebar";

export default function AdminSidebar() {
  const { user, signOut } = useAuth();
  // Las opciones de administración solo se muestran a este rol.
  const isAdmin = user?.role?.name === "ADMIN";

  return (
    <Sidebar>
      <SidebarHeader>
        <Link className="admin-brand" to="/account" aria-label="Fixly, Mi cuenta">
          <span className="admin-brand-icon">
            <WrenchIcon aria-hidden="true" />
          </span>
          <span>Fixly</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <section className="admin-nav-group" aria-labelledby="personal-nav-heading">
          <h2 className="admin-nav-heading" id="personal-nav-heading">Mi espacio</h2>
          <SidebarMenu aria-label="Mi espacio">
            <SidebarMenuLink end icon={<CircleUserRoundIcon aria-hidden="true" />} to="/account">
              Mi cuenta
            </SidebarMenuLink>
            <SidebarMenuLink icon={<UsersIcon aria-hidden="true" />} to="/account/profiles">
              Mis perfiles
            </SidebarMenuLink>
            <SidebarMenuLink icon={<KeyRoundIcon aria-hidden="true" />} to="/account/password">
              Contraseña
            </SidebarMenuLink>
          </SidebarMenu>
        </section>

        {isAdmin && (
          <section className="admin-nav-group" aria-labelledby="admin-nav-heading">
            <h2 className="admin-nav-heading" id="admin-nav-heading">Administración</h2>
            <SidebarMenu aria-label="Administración">
              <SidebarMenuLink end icon={<WrenchIcon aria-hidden="true" />} to="/services">
                Servicios
              </SidebarMenuLink>
              <SidebarMenuLink icon={<LayersIcon aria-hidden="true" />} to="/variants">
                Variantes
              </SidebarMenuLink>
              <SidebarMenuLink icon={<TagIcon aria-hidden="true" />} to="/categories">
                Categorías
              </SidebarMenuLink>
              <SidebarMenuLink icon={<UsersIcon aria-hidden="true" />} to="/users">
                Usuarios
              </SidebarMenuLink>
              <SidebarMenuLink icon={<ShieldCheckIcon aria-hidden="true" />} to="/roles">
                Roles
              </SidebarMenuLink>
              <SidebarMenuLink icon={<BriefcaseIcon aria-hidden="true" />} to="/workers">
                Trabajadores
              </SidebarMenuLink>
            </SidebarMenu>
          </section>
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className="admin-preference-row">
          <SunIcon aria-hidden="true" />
          <span>Apariencia</span>
          <ThemeSelector />
        </div>
        <Button className="admin-logout" variant="ghost" onClick={signOut}>
          <LogOutIcon aria-hidden="true" />
          <span>Cerrar sesión</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}