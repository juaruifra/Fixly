const ignoredWords = new Set(["de", "del", "la", "el", "los", "las"]);

// Forma el prefijo con las dos primeras palabras útiles del slug del servicio.
export function getVariantSkuPrefix(serviceSlug, duration) {
  const words = String(serviceSlug || "")
    .toLowerCase()
    .split(/[_-]+/)
    .filter((word) => word && !ignoredWords.has(word));

  let abbreviation;
  if (words.length >= 2) {
    abbreviation = `${words[0].slice(0, 3)}-${words[1].slice(0, 3)}`;
  } else if (words.length === 1) {
    abbreviation = `${words[0].slice(0, 3)}-SRV`;
  } else {
    abbreviation = "SRV-SVC";
  }

  const durationCode =
    duration % 60 === 0 ? `${duration / 60}H` : `${duration}M`;

  return `${abbreviation}-${durationCode}`.toUpperCase();
}