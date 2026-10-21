const STATUS_LABELS = {
  draft: "Borrador",
  published: "Publicado",
  paused: "Pausado",
  discontinued: "Retirado",
};

function getCategoryColor(category = "") {
  return [...category].reduce((hash, character) => hash + character.charCodeAt(0), 0) % 6;
}

export default function ServiceChip({ value, kind = "category", label }) {
  const className =
    kind === "status"
      ? `service-chip service-chip--status-${value}`
      : `service-chip service-chip--category-${getCategoryColor(value)}`;

  return (
    <span className={className}>
      {label || (kind === "status" ? STATUS_LABELS[value] : value)}
    </span>
  );
}