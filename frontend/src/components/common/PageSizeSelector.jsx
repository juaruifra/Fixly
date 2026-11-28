export const PAGE_SIZE_OPTIONS = Object.freeze([2, 4, 8, 12, 24, 36, 48]);

/**
 * Selector común del número de registros por página.
 * Mantiene valores personalizados recibidos por URL aunque no estén entre
 * las opciones habituales admitidas por el contrato.
 *
 * @param {Object} props - Configuración del selector.
 * @param {number} props.value - Límite actual.
 * @param {(limit:number) => void} props.onChange - Recibe el nuevo límite.
 * @param {string} [props.label="Por página"] - Texto visible junto al selector.
 * @returns {import("react").JSX.Element} Selector accesible.
 */
export default function PageSizeSelector({ value, onChange, label = "Por página" }) {
  const options = [...PAGE_SIZE_OPTIONS];
  if (!options.includes(value)) options.push(value);
  options.sort((first, second) => first - second);

  return (
    <label className="page-size-selector">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(Number(event.target.value))}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}
