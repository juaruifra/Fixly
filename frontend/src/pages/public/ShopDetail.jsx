import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeftIcon } from "lucide-react";

import ErrorState from "@/components/common/ErrorState";
import ShopDetailContent from "@/features/shop-detail/ShopDetailContent";
import { useShopDetail } from "@/features/shop-detail/useShopDetail";

export function ShopDetailView({ state, search, slug }) {
  if (state.status === "ready") {
    return <ShopDetailContent key={slug} detail={state.detail} variants={state.variants} search={search} />;
  }

  return (
    <div className="detail-page">
      <Link className="detail-back" to={{ pathname: "/shop", search }}><ArrowLeftIcon aria-hidden="true" /> Volver a servicios</Link>
      {state.status === "loading" && <p className="shop-message" role="status">Cargando servicio...</p>}
      {state.status === "not-found" && <div className="detail-message" role="status"><h1>Servicio no disponible</h1><p>Este servicio ya no está disponible.</p></div>}
      {state.status === "error" && <ErrorState title="No se pudo cargar el servicio" message={state.error} onRetry={state.retry} />}
    </div>
  );
}

export default function ShopDetail() {
  const { slug } = useParams();
  const { search } = useLocation();
  const state = useShopDetail(slug);
  return <ShopDetailView state={state} search={search} slug={slug} />;
}