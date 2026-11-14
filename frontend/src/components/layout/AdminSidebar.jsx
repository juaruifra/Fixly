import { Link } from "react-router-dom";
import {
  LayersIcon,
  PlusIcon,
  ShieldCheckIcon,
  TagIcon,
  UsersIcon,
  BriefcaseIcon,
  LogOutIcon,
  CircleUserRoundIcon,
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
  const { signOut } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader>
        <Link className="admin-brand" to="/services" aria-label="Fixly, inicio">
          <span className="admin-brand-icon">
            <WrenchIcon aria-hidden="true" />
          </span>
          <span>Fixly</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuLink
            end
            icon={<WrenchIcon aria-hidden="true" />}
            to="/services"
          >
            Servicios
          </SidebarMenuLink>
          <SidebarMenuLink
            icon={<LayersIcon aria-hidden="true" />}
            to="/variants"
          >
            Variantes
          </SidebarMenuLink>
          {/* Desde aquí se accede a la administración de categorías. */}
          <SidebarMenuLink
            icon={<TagIcon aria-hidden="true" />}
            to="/categories"
          >
            Categorías
          </SidebarMenuLink>
          <SidebarMenuLink
            icon={<ShieldCheckIcon aria-hidden="true" />}
            to="/roles"
          >
            Roles
          </SidebarMenuLink>
          <SidebarMenuLink
            icon={<UsersIcon aria-hidden="true" />}
            to="/users"
          >
            Usuarios
          </SidebarMenuLink>
          <SidebarMenuLink
            icon={<BriefcaseIcon aria-hidden="true" />}
            to="/workers"
          >
            Trabajadores
          </SidebarMenuLink>
          <SidebarMenuLink
            icon={<CircleUserRoundIcon aria-hidden="true" />}
            to="/account"
          >
            Mi cuenta
          </SidebarMenuLink>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <span className="admin-theme-label">Tema</span>
        <ThemeSelector />
        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Cerrar sesión" title="Cerrar sesión">
          <LogOutIcon aria-hidden="true" />
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}