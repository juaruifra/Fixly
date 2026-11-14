const CATEGORY_PALETTES = [
  "color-0",
  "color-1",
  "color-2",
  "color-3",
  "color-4",
  "color-5",
];

// El mismo nombre de categoría conserva su color en todas las tablas.
export function getCategoryPalette(category = "") {
  const hash = [...category].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return CATEGORY_PALETTES[hash % CATEGORY_PALETTES.length];
}