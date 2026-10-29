import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import MainLayout from "@/layouts/MainLayout";
import { PageLoader } from "@/components/common/PageLoader";

// Las pantallas se cargan cuando se visitan para no enviar todo al inicio.
const ServiceList = lazy(() => import("@/pages/ServiceList"));
const ServiceCreate = lazy(() => import("@/pages/ServiceCreate"));
const ServiceDetails = lazy(() => import("@/pages/ServiceDetails"));
const ServiceEdit = lazy(() => import("@/pages/ServiceEdit"));
const CategoryList = lazy(() => import("@/pages/CategoryList"));
const CategoryCreate = lazy(() => import("@/pages/CategoryCreate"));
const CategoryDetails = lazy(() => import("@/pages/CategoryDetails"));
const CategoryEdit = lazy(() => import("@/pages/CategoryEdit"));

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Navigate to="/services" replace />} />
          <Route path="/services" element={<ServiceList />} />
          <Route path="/services/new" element={<ServiceCreate />} />
          <Route path="/services/:id" element={<ServiceDetails />} />
          <Route path="/services/:id/edit" element={<ServiceEdit />} />
          <Route path="/categories" element={<CategoryList />} />
          <Route path="/categories/new" element={<CategoryCreate />} />
          <Route path="/categories/:id" element={<CategoryDetails />} />
          <Route path="/categories/:id/edit" element={<CategoryEdit />} />
          {/* Conserva el comportamiento anterior para direcciones desconocidas. */}
          <Route path="*" element={<Navigate to="/services" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
