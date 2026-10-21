import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  EyeIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  RotateCwIcon,
  Trash2Icon,
} from "lucide-react";
import DataTable from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import ServiceChip from "@/features/services/components/ServiceChip";
import { useServices } from "@/hooks/useServices";
import { confirmServiceAction } from "@/utils/confirmAction";

const STATUS_OPTIONS = [
  { value: "draft", label: "Borrador" },
  { value: "published", label: "Publicado" },
  { value: "paused", label: "Pausado" },
  { value: "discontinued", label: "Retirado" },
];

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
        className={`service-status-select service-chip--status-${service.status}`}
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

  const filters = useMemo(() => {
    const params = {};

    if (recordFilter === "active") {
      params.active = true;
      params.deleted = false;
    } else if (recordFilter === "inactive") {
      params.active = false;
      params.deleted = false;
    } else if (recordFilter === "deleted") {
      params.deleted = true;
    }

    if (statusFilter !== "all") params.status = statusFilter;

    return params;
  }, [recordFilter, statusFilter]);

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

  useEffect(() => {
    loadServices(filters);
  }, [filters, loadServices]);

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
        accessorKey: "category",
        header: "Categoría",
        cell: ({ getValue }) => (
          <ServiceChip value={getValue()} kind="category" />
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
        accessorKey: "status",
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
            <ServiceChip value="deleted" kind="status" label="Eliminado" />
          ) : (
            <span className="service-chip service-record-live">
              No eliminado
            </span>
          ),
      },
      {
        id: "actions",
        header: "Acciones",
        enableGlobalFilter: false,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="service-table-actions">
            <Button
              variant="ghost"
              size="icon"
              render={<Link to={`/services/${row.original._id}`} />}
              aria-label={`Ver ${row.original.name}`}
              title="Ver detalle"
            >
              <EyeIcon />
            </Button>
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

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Servicios</h1>
          <p className="muted">
            Gestiona los servicios de reparación y mantenimiento a domicilio.
          </p>
        </div>

        <Button render={<Link to="/services/new" />}>
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

      {error && (
        <Button
          className="service-list-retry"
          variant="outline"
          size="sm"
          onClick={loadServices}
        >
          <RotateCwIcon aria-hidden="true" />
          Reintentar carga
        </Button>
      )}

      <DataTable
        columns={columns}
        data={visibleServices}
        loading={loading}
        emptyMessage="No hay servicios que coincidan."
        getRowClassName={getServiceRowClassName}
      />

    </section>
  );
}
