import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import MainLayout from "@/layouts/MainLayout";
import { PageLoader } from "@/components/common/PageLoader";

// Las pantallas se cargan cuando se visitan para no enviar todo al inicio.
const ServiceList = lazy(() => import("@/pages/services/ServiceList"));
const ServiceCreate = lazy(() => import("@/pages/services/ServiceCreate"));
const ServiceDetails = lazy(() => import("@/pages/services/ServiceDetails"));
const ServiceEdit = lazy(() => import("@/pages/services/ServiceEdit"));
const CategoryList = lazy(() => import("@/pages/categories/CategoryList"));
const CategoryCreate = lazy(() => import("@/pages/categories/CategoryCreate"));
const CategoryDetails = lazy(() => import("@/pages/categories/CategoryDetails"));
const CategoryEdit = lazy(() => import("@/pages/categories/CategoryEdit"));

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
