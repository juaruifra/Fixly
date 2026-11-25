import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import CatalogImage from "@/components/common/CatalogImage";

export default function ShopGallery({ images }) {
  const [index, setIndex] = useState(0);
  const hasImages = images.length > 0;

  return (
    <section className="detail-gallery" aria-label="Imágenes del servicio">
      <div className="detail-gallery-image"><CatalogImage image={hasImages ? images[index] : null} /></div>
      {images.length > 1 && (
        <div className="detail-gallery-controls">
          <button type="button" title="Imagen anterior" aria-label="Imagen anterior" onClick={() => setIndex((value) => (value - 1 + images.length) % images.length)}><ChevronLeftIcon aria-hidden="true" /></button>
          <span aria-live="polite">{index + 1} / {images.length}</span>
          <button type="button" title="Imagen siguiente" aria-label="Imagen siguiente" onClick={() => setIndex((value) => (value + 1) % images.length)}><ChevronRightIcon aria-hidden="true" /></button>
        </div>
      )}
    </section>
  );
}