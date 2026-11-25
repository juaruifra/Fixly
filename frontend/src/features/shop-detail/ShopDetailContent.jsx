import { useId, useState } from "react";
import { ArrowLeftIcon, Clock3Icon } from "lucide-react";
import { Link } from "react-router-dom";

import CatalogImage from "@/components/common/CatalogImage";
import ShopGallery from "@/features/shop-detail/ShopGallery";

const currency = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export default function ShopDetailContent({ detail, variants, search }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const selectionName = useId();
  const selected = selectedIndex === null ? null : variants[selectedIndex];

  return (
    <div className="detail-page">
      <Link className="detail-back" to={{ pathname: "/shop", search }}><ArrowLeftIcon aria-hidden="true" /> Volver a servicios</Link>
      <div className="detail-layout">
        <ShopGallery images={detail.images} />
        <section className="detail-info" aria-labelledby="detail-title">
          <p className="detail-category">{detail.category.name}</p>
          <h1 id="detail-title">{detail.name}</h1>
          {detail.description && <p className="detail-description">{detail.description}</p>}
          <p className="detail-price"><span>{selected ? "Precio" : "Desde"}</span> {currency.format(selected ? selected.price : detail.priceFrom)}</p>
          <fieldset className="detail-variants">
            <legend>Elige una modalidad</legend>
            {variants.length === 0 && <p>No hay modalidades disponibles en este momento.</p>}
            {variants.map((variant, index) => (
              <label className={`detail-variant${selectedIndex === index ? " is-selected" : ""}`} key={index}>
                <input type="radio" name={selectionName} checked={selectedIndex === index} onChange={() => setSelectedIndex(index)} />
                <span className="detail-variant-image"><CatalogImage image={variant.image} /></span>
                <span className="detail-variant-copy">
                  <strong>{variant.name}</strong>
                  {variant.description && <span>{variant.description}</span>}
                  <span className="detail-variant-duration"><Clock3Icon aria-hidden="true" /> {variant.duration} min</span>
                </span>
                <strong className="detail-variant-price">{currency.format(variant.price)}</strong>
              </label>
            ))}
          </fieldset>
        </section>
      </div>
    </div>
  );
}