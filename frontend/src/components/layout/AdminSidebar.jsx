import { Link } from "react-router-dom";
import {
  LayersIcon,
  PlusIcon,
  ShieldCheckIcon,
  TagIcon,
  UsersIcon,
  BriefcaseIcon,
  WrenchIcon,
} from "lucide-react";

import ThemeSelector from "@/components/ThemeSelector";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuLink,
} from "@/components/ui/sidebar";

export default function AdminSidebar() {
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
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <span className="admin-theme-label">Tema</span>
        <ThemeSelector />
      </SidebarFooter>
    </Sidebar>
  );
}