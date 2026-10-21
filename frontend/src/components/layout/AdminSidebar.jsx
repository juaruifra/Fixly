import { Link } from "react-router-dom";
import { PlusIcon, WrenchIcon } from "lucide-react";

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
            icon={<PlusIcon aria-hidden="true" />}
          to="/services/new"
        >
            Crear servicio
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