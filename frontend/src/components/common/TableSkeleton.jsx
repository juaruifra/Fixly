export default function TableSkeleton({ rows = 5, columns = 6 }) {
  return (
    <div className="data-table-skeleton" role="status" aria-label="Cargando servicios">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div
          className="data-table-skeleton-row"
          key={rowIndex}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }, (_, columnIndex) => (
            <span
              className="data-table-skeleton-cell"
              key={`${rowIndex}-${columnIndex}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}