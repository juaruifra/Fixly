import { ArrowDownIcon } from "lucide-react";
import { Link } from "react-router-dom";

import CatalogImage from "@/components/common/CatalogImage";
import Carousel from "@/components/common/Carousel";
import ErrorState from "@/components/common/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { useHomeCategories } from "@/hooks/useHomeCategories";

export function HomeContent({ categories, status, error, retry }) {
  return (
    <>
      <section className="home-intro">
        <div className="home-intro-inner">
          <p className="home-eyebrow"><span /> SERVICIOS PARA TU DÍA A DÍA</p>
          <h1>Fixly<span>.</span></h1>
          <p className="home-intro-copy">Encuentra el servicio que necesitas para cuidar de tus espacios.</p>
          <a className="home-discover" href="#categorias">Explorar categorías <ArrowDownIcon aria-hidden="true" /></a>
        </div>
      </section>
      <section className="home-categories" id="categorias" aria-labelledby="categories-heading">
        <div className="home-section-heading">
          <div>
            <p className="home-section-kicker">ELIGE POR CATEGORÍA</p>
            <h2 id="categories-heading">¿Qué necesitas?</h2>
          </div>
          {status === "ready" && <span className="home-category-count">{categories.length} categorías</span>}
        </div>
        {status === "loading" && (
          <div className="carousel home-carousel-skeleton" role="status" aria-label="Cargando categorías">
            <div className="carousel-viewport">
              <div className="carousel-track">
                {Array.from({ length: 4 }, (_, index) => (
                  <div className="home-category home-category-skeleton" key={index}>
                    <Skeleton className="home-category-skeleton-image" />
                    <div className="home-category-skeleton-label">
                      <Skeleton className="home-category-skeleton-name" />
                      <Skeleton className="home-category-skeleton-number" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <span className="sr-only">Cargando categorías...</span>
          </div>
        )}
        {status === "error" && <ErrorState title="No se pudieron cargar las categorías" message={error} onRetry={retry} />}
        {status === "ready" && categories.length === 0 && <p className="home-status">No hay categorías disponibles en este momento.</p>}
        {status === "ready" && categories.length > 0 && (
          <Carousel label="Categorías de servicios" itemsPerView={{ desktop: 4, tablet: 3, mobile: 1.2 }}>
            {categories.map((category, index) => (
              <Link className="home-category" key={category.slug} to={`/shop?${new URLSearchParams({ categories: category.slug })}`}>
                <div className="home-category-image"><CatalogImage image={category.image} /></div>
                <div className="home-category-label">
                  <h3>{category.name}</h3>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
              </Link>
            ))}
          </Carousel>
        )}
      </section>
    </>
  );
}

export default function Home() {
  const categoriesState = useHomeCategories();
  return <HomeContent {...categoriesState} />;
}