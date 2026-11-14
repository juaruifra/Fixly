import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import MainLayout from "@/layouts/MainLayout";
import { PageLoader } from "@/components/common/PageLoader";
import { AppProvider } from "@/providers/AppProvider";
import RequireAuth from "@/routes/RequireAuth";

// Las pantallas se cargan cuando se visitan para no enviar todo al inicio.
const ServiceList = lazy(() => import("@/pages/services/ServiceList"));
const ServiceCreate = lazy(() => import("@/pages/services/ServiceCreate"));
const ServiceEdit = lazy(() => import("@/pages/services/ServiceEdit"));
const CategoryList = lazy(() => import("@/pages/categories/CategoryList"));
const CategoryCreate = lazy(() => import("@/pages/categories/CategoryCreate"));
const CategoryEdit = lazy(() => import("@/pages/categories/CategoryEdit"));
const VariantList = lazy(() => import("@/pages/variants/VariantList"));
const VariantCreate = lazy(() => import("@/pages/variants/VariantCreate"));
const VariantEdit = lazy(() => import("@/pages/variants/VariantEdit"));
const RoleList = lazy(() => import("@/pages/roles/RoleList"));
const RoleCreate = lazy(() => import("@/pages/roles/RoleCreate"));
const RoleEdit = lazy(() => import("@/pages/roles/RoleEdit"));
const UserList = lazy(() => import("@/pages/users/UserList"));
const UserCreate = lazy(() => import("@/pages/users/UserCreate"));
const UserEdit = lazy(() => import("@/pages/users/UserEdit"));
const WorkerList = lazy(() => import("@/pages/workers/WorkerList"));
const WorkerCreate = lazy(() => import("@/pages/workers/WorkerCreate"));
const WorkerEdit = lazy(() => import("@/pages/workers/WorkerEdit"));
const Login = lazy(() => import("@/pages/auth/Login"));
const Account = lazy(() => import("@/pages/auth/Account"));

// Los datos administrativos se cargan solo después de comprobar el rol ADMIN.
function AdminLayout() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route path="/account" element={<Account />} />
        </Route>
        <Route element={<RequireAuth adminOnly />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/services" replace />} />
          <Route path="/services" element={<ServiceList />} />
          <Route path="/services/new" element={<ServiceCreate />} />
          <Route path="/services/:id/edit" element={<ServiceEdit />} />
          <Route path="/categories" element={<CategoryList />} />
          <Route path="/categories/new" element={<CategoryCreate />} />
          <Route path="/categories/:id/edit" element={<CategoryEdit />} />
          <Route path="/variants" element={<VariantList />} />
          <Route path="/variants/new" element={<VariantCreate />} />
          <Route path="/variants/:id/edit" element={<VariantEdit />} />
          <Route path="/roles" element={<RoleList />} />
          <Route path="/roles/new" element={<RoleCreate />} />
          <Route path="/roles/:id/edit" element={<RoleEdit />} />
          <Route path="/users" element={<UserList />} />
          <Route path="/users/new" element={<UserCreate />} />
          <Route path="/users/:id/edit" element={<UserEdit />} />
          <Route path="/workers" element={<WorkerList />} />
          <Route path="/workers/new" element={<WorkerCreate />} />
          <Route path="/workers/:id/edit" element={<WorkerEdit />} />
          {/* Conserva el comportamiento anterior para direcciones desconocidas. */}
          <Route path="*" element={<Navigate to="/services" replace />} />
        </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
