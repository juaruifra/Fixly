import { useState } from "react";
import { ImageOffIcon } from "lucide-react";

export default function CatalogImage({ image }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const url = image?.url;

  if (!url || failedUrl === url) {
    return (
      <div className="catalog-image-fallback" aria-label="Sin imagen disponible" role="img">
        <ImageOffIcon aria-hidden="true" />
      </div>
    );
  }

  return <img src={url} alt={image.alt || ""} loading="lazy" onError={() => setFailedUrl(url)} />;
}