import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

function Sidebar({ className, ...props }) {
  return (
    <aside
      data-slot="sidebar"
      className={cn("admin-sidebar", className)}
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn("admin-sidebar-header", className)}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn("admin-sidebar-content", className)}
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }) {
  return (
    <nav
      data-slot="sidebar-menu"
      className={cn("admin-navigation", className)}
      aria-label="Navegación principal"
      {...props}
    />
  );
}

function SidebarMenuLink({
  to,
  end = false,
  icon,
  className,
  children,
  ...props
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn("admin-nav-link", isActive && "active", className)
      }
      {...props}
    >
      {icon}
      {children}
    </NavLink>
  );
}

function SidebarFooter({ className, ...props }) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn("admin-sidebar-footer", className)}
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuLink,
  SidebarFooter,
};