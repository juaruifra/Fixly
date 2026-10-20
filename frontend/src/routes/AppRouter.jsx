import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "@/components/Layout";
import Loading from "@/components/Loading";

const ServiceList = lazy(() => import("@/pages/ServiceList"));
const ServiceCreate = lazy(() => import("@/pages/ServiceCreate"));
const ServiceDetails = lazy(() => import("@/pages/ServiceDetails"));
const ServiceEdit = lazy(() => import("@/pages/ServiceEdit"));

export function AppRouter() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/services" replace />} />
          <Route path="/services" element={<ServiceList />} />
          <Route path="/services/new" element={<ServiceCreate />} />
          <Route path="/services/:id" element={<ServiceDetails />} />
          <Route path="/services/:id/edit" element={<ServiceEdit />} />
          <Route path="*" element={<Navigate to="/services" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}