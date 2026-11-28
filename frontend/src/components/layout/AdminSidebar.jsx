import {
  BriefcaseIcon,
  LayersIcon,
  ShieldCheckIcon,
  TagIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuLink,
} from "@/components/ui/sidebar";

// Solo ofrece navegación CRUD administrativa; el menú personal vive en la navbar.
export default function AdminSidebar() {

  return (
    <Sidebar>
      <SidebarContent>
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
      </SidebarContent>

    </Sidebar>
  );
}