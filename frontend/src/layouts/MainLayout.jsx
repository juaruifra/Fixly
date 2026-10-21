import { Outlet } from "react-router-dom";

import AdminSidebar from "@/components/layout/AdminSidebar";

export default function MainLayout() {
  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-main">
        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}