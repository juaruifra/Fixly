import { Link } from "react-router-dom";
import {
  ClockIcon,
  EllipsisIcon,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
  WrenchIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ServiceCard({ service, onDelete }) {
  // Dejamos el formato del precio preparado una sola vez.
  const formattedPrice = Number(service.price).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
  });

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="flex flex-row items-start gap-4 p-5">
        {/* El icono ayuda a identificar visualmente el tipo de contenido. */}
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <WrenchIcon className="size-5 text-muted-foreground" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="secondary">
              {service.category}
            </Badge>

            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ClockIcon className="size-3.5" />
              {service.duration} min
            </span>
          </div>

          <CardTitle className="text-lg">
            {service.name}
          </CardTitle>
        </div>

        {/* Las acciones secundarias quedan agrupadas para no recargar la tarjeta. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Opciones de ${service.name}`}
              />
            }
          >
            <EllipsisIcon />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem
              render={<Link to={`/services/${service._id}`} />}
            >
              <EyeIcon />
              Ver detalle
            </DropdownMenuItem>

            <DropdownMenuItem
              render={<Link to={`/services/${service._id}/edit`} />}
            >
              <PencilIcon />
              Editar
            </DropdownMenuItem>

            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(service)}
            >
              <Trash2Icon />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="px-5 pb-5">
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {service.description || "Sin descripción."}
        </p>
      </CardContent>

      <CardFooter className="flex justify-between border-t px-5 py-4">
        <strong className="text-lg">
          {formattedPrice}
        </strong>

        {/* Mantenemos visible la acción más habitual. */}
        <Button
          variant="outline"
          size="sm"
          render={<Link to={`/services/${service._id}`} />}
        >
          Ver servicio
        </Button>
      </CardFooter>
    </Card>
  );
}