import ShopFilters from "@/features/shop/ShopFilters";
import ShopResults from "@/features/shop/ShopResults";
import { useShop } from "@/features/shop/useShop";

export default function ShopList() {
  const shop = useShop();

  return (
    <div className="shop-page">
      <header className="shop-page-heading">
        <p className="home-section-kicker">CATÁLOGO FIXLY</p>
        <h1>Servicios</h1>
      </header>
      {shop.queryError ? (
        <div className="error-state" role="alert">
          <div><h2>La dirección contiene filtros inválidos</h2><p>{shop.queryError}</p></div>
          <button type="button" className="shop-apply" onClick={shop.clear}>Limpiar filtros</button>
        </div>
      ) : (
        <div className="shop-layout">
          <ShopFilters {...shop} />
          <ShopResults {...shop} />
        </div>
      )}
    </div>
  );
}