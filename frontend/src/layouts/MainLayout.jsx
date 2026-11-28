import { Suspense } from "react";
import { Outlet } from "react-router-dom";

import AdminSidebar from "@/components/layout/AdminSidebar";
import { PageLoader } from "@/components/common/PageLoader";
import { FixlyNavbar } from "@/layouts/PublicLayout";

// Layout administrativo: navbar común, sidebar propia y sin footer público.
export default function MainLayout() {
  return (
    <div className="public-shell">
      <FixlyNavbar />
      <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-main">
        <div className="admin-content">
          <Suspense fallback={<PageLoader />}><Outlet /></Suspense>
        </div>
      </main>
      </div>
    </div>
  );
}