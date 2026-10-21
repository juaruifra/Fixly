import { Button } from "@/components/ui/button";

export default function ErrorState({
  title = "No se pudieron cargar los datos",
  message,
  onRetry,
}) {
  return (
    <div className="error-state" role="alert">
      <div>
        <h2>{title}</h2>
        {message && <p>{message}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}