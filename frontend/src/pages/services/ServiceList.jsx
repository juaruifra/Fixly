import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import DataTable from "@/components/common/DataTable";
import ErrorState from "@/components/common/ErrorState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useServices } from "@/hooks/useServices";
import { confirmServiceAction } from "@/utils/confirmAction";

const STATUS_TONES = {
  draft: "warning",
  published: "success",
  paused: "info",
  discontinued: "neutral",
  deleted: "danger",
};

const CATEGORY_PALETTES = [
  "color-0",
  "color-1",
  "color-2",
  "color-3",
  "color-4",
  "color-5",
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Borrador" },
  { value: "published", label: "Publicado" },
  { value: "paused", label: "Pausado" },
  { value: "discontinued", label: "Retirado" },
];

function getCategoryPalette(category = "") {
  const hash = [...category].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return CATEGORY_PALETTES[hash % CATEGORY_PALETTES.length];
}

const RECORD_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
  { value: "deleted", label: "Eliminados" },
];

function getServiceRowClassName(service) {
  if (service.deletedAt) return "data-row-deleted";
  if (!service.active) return "data-row-inactive";
  return undefined;
}

function ServiceStatusSelect({ service, onChange, disabled }) {
  return (
    <Select
      value={service.status}
      disabled={disabled || Boolean(service.deletedAt)}
      onValueChange={(status) => onChange(service, status)}
    >
      <SelectTrigger
        className={`service-status-select tone--${STATUS_TONES[service.status] ?? "neutral"}`}
        aria-label={`Cambiar estado de ${service.name}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map(({ value, label }) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function ServiceList() {
  const [recordFilter, setRecordFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const {
    services,
    loading,
    error,
    submitting,
    loadServices,
    deleteService,
    restoreService,
    changeServiceActive,
    changeServiceStatus,
  } = useServices();

  const visibleServices = useMemo(
    () =>
      services.filter((service) => {
        const isDeleted = Boolean(service.deletedAt);
        const matchesRecordFilter =
          recordFilter === "all" ||
          (recordFilter === "active" && service.active && !isDeleted) ||
          (recordFilter === "inactive" && !service.active && !isDeleted) ||
          (recordFilter === "deleted" && isDeleted);
        const matchesStatusFilter =
          statusFilter === "all" || service.status === statusFilter;

        return matchesRecordFilter && matchesStatusFilter;
      }),
    [recordFilter, services, statusFilter],
  );

  const retryServices = useCallback(() => loadServices(), [loadServices]);

  const updateStatus = useCallback(
    (service, status) => changeServiceStatus(service._id, status),
    [changeServiceStatus],
  );

  const updateActive = useCallback(
    (service, active) => changeServiceActive(service._id, active),
    [changeServiceActive],
  );

  const remove = useCallback(
    async (service) => {
      const confirmed = await confirmServiceAction({
        title: "Eliminar servicio",
        message: `¿Quieres eliminar “${service.name}”? Podrás restaurarlo después.`,
        confirmText: "Eliminar",
        danger: true,
      });

      if (confirmed) await deleteService(service._id);
    },
    [deleteService],
  );

  const restore = useCallback(
    async (service) => {
      const confirmed = await confirmServiceAction({
        title: "Restaurar servicio",
        message: `¿Quieres restaurar “${service.name}”?`,
        confirmText: "Restaurar",
      });

      if (confirmed) await restoreService(service._id);
    },
    [restoreService],
  );

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Nombre",
        cell: ({ row }) => (
          <div className="service-name-cell">
            <strong>{row.original.name}</strong>
            <span>{row.original.description || "Sin descripción."}</span>
          </div>
        ),
      },
      {
        id: "category",
        // El backend devuelve la categoría poblada; la tabla ordena y busca por nombre.
        accessorFn: (service) => service.category?.name ?? "",
        header: "Categoría",
        cell: ({ getValue }) => (
          <Badge variant="chip" palette={getCategoryPalette(getValue())}>
            {getValue()}
          </Badge>
        ),
      },
      {
        accessorKey: "price",
        header: "Precio",
        cell: ({ getValue }) =>
          Number(getValue()).toLocaleString("es-ES", {
            style: "currency",
            currency: "EUR",
          }),
      },
      {
        accessorKey: "duration",
        header: "Duración",
        cell: ({ getValue }) => `${getValue()} min`,
      },
      {
        id: "status",
        // La búsqueda usa el nombre visible del estado, no su código interno.
        accessorFn: (service) =>
          STATUS_OPTIONS.find(({ value }) => value === service.status)?.label ?? service.status,
        header: "Estado",
        cell: ({ row }) => (
          <ServiceStatusSelect
            service={row.original}
            onChange={updateStatus}
            disabled={submitting}
          />
        ),
      },
      {
        accessorKey: "active",
        header: "Activo",
        enableGlobalFilter: false,
        cell: ({ row }) => (
          <Switch
            checked={Boolean(row.original.active)}
            disabled={submitting || Boolean(row.original.deletedAt)}
            onCheckedChange={(active) => updateActive(row.original, active)}
            aria-label={`${row.original.active ? "Desactivar" : "Activar"} ${row.original.name}`}
          />
        ),
      },
      {
        accessorKey: "deletedAt",
        header: "Eliminado",
        enableGlobalFilter: false,
        cell: ({ getValue }) =>
          getValue() ? (
            <Badge variant="chip" tone={STATUS_TONES.deleted}>
              Sí
            </Badge>
          ) : (
            <Badge variant="chip" tone="success">
              No
            </Badge>
          ),
      },
      {
        id: "actions",
        header: "Acciones",
        enableGlobalFilter: false,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="service-table-actions">
            {row.original.deletedAt ? (
              <Button
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={() => restore(row.original)}
                aria-label={`Restaurar ${row.original.name}`}
                title="Restaurar"
              >
                <RotateCcwIcon />
                Restaurar
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  nativeButton={false}
                  render={<Link to={`/services/${row.original._id}/edit`} />}
                  aria-label={`Editar ${row.original.name}`}
                  title="Editar"
                >
                  <PencilIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={submitting}
                  onClick={() => remove(row.original)}
                  aria-label={`Eliminar ${row.original.name}`}
                  title="Eliminar"
                >
                  <Trash2Icon />
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [restore, submitting, updateActive, updateStatus],
  );

  const tableContent = loading ? (
    <TableSkeleton rows={6} columns={8} />
  ) : error ? (
    <ErrorState message={error} onRetry={retryServices} />
  ) : (
    <DataTable
      ariaLabel="Tabla de servicios"
      columns={columns}
      data={visibleServices}
      emptyMessage="No hay servicios que coincidan."
      searchLabel="Buscar servicios"
      searchPlaceholder="Buscar servicios…"
      searchDescription="Busca por nombre, categoría, precio, duración o estado. Los filtros superiores acotan por registro y estado."
      getRowClassName={getServiceRowClassName}
    />
  );

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Servicios</h1>
          <p className="muted">
            Gestiona los servicios de reparación y mantenimiento a domicilio.
          </p>
        </div>

        <Button nativeButton={false} render={<Link to="/services/new" />}>
          <PlusIcon aria-hidden="true" />
          Crear servicio
        </Button>
      </div>

      <div className="service-list-filters">
        <div className="service-record-filters" aria-label="Filtrar servicios">
          {RECORD_FILTERS.map(({ value, label }) => (
            <Button
              key={value}
              variant={recordFilter === value ? "secondary" : "outline"}
              size="sm"
              aria-pressed={recordFilter === value}
              onClick={() => setRecordFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger
            className="service-filter-status"
            aria-label="Filtrar por estado"
          >
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {STATUS_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {tableContent}

    </section>
  );
}
