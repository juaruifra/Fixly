import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRoles } from "@/hooks/useRoles";
import {
  createUserSchema,
  updateUserSchema,
} from "@/features/users/userSchema";

const EMPTY_VALUES = {
  name: "",
  email: "",
  role: "",
  password: "",
  confirmPassword: "",
};

function getRoleId(role) {
  return String(role?._id ?? role ?? "");
}

function getFormValues(values = {}) {
  return {
    name: values.name ?? EMPTY_VALUES.name,
    email: values.email ?? EMPTY_VALUES.email,
    role: getRoleId(values.role),
    password: "",
    confirmPassword: "",
  };
}

function FieldError({ id, message }) {
  if (!message) return null;

  return (
    <small id={id} className="field-error">
      {message}
    </small>
  );
}

export default function UserForm({
  initialValues = EMPTY_VALUES,
  onSubmit,
  submitLabel = "Guardar",
  submitting = false,
  creating = false,
}) {
  const {
    roles,
    loading: rolesLoading,
    error: rolesError,
    loadRoles,
  } = useRoles();
  const currentRole = initialValues.role;
  const currentRoleId = getRoleId(currentRole);
  const roleOptions = useMemo(() => {
    const options = roles.filter((role) => role.active && !role.deletedAt);
    const currentRoleIsListed = options.some(
      (role) => role._id === currentRoleId,
    );

    // Conserva una relación actual inactiva para que el formulario no la oculte.
    if (currentRoleId && !currentRoleIsListed) {
      if (typeof currentRole === "object" && currentRole !== null) {
        options.push(currentRole);
      } else {
        options.push({
          _id: currentRoleId,
          name: "Rol actual no disponible",
          active: false,
          deletedAt: null,
        });
      }
    }
    return options;
  }, [currentRole, currentRoleId, roles]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(creating ? createUserSchema : updateUserSchema),
    defaultValues: getFormValues(initialValues),
  });

  useEffect(() => {
    // El selector necesita cargar roles activos antes de poder asignar uno nuevo.
    void loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    // En edición, carga el usuario recibido sin recuperar ni rellenar su contraseña.
    reset(getFormValues(initialValues));
  }, [initialValues, reset]);

  async function submit(values) {
    // La confirmación solo valida el formulario; el backend recibe una contraseña.
    const userData = {
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      role: values.role,
    };

    // Una contraseña vacía en edición significa conservar la que ya tiene.
    if (creating || values.password) userData.password = values.password;
    await onSubmit(userData);
  }

  const isSaving = submitting || isSubmitting;

  return (
    <form
      className="card form-card"
      onSubmit={handleSubmit(submit)}
      noValidate
    >
      <div className="form-grid">
        <label htmlFor="user-name">
          <span>Nombre *</span>
          <input
            id="user-name"
            maxLength={120}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "user-name-error" : undefined}
            {...register("name")}
          />
          <FieldError id="user-name-error" message={errors.name?.message} />
        </label>

        <label htmlFor="user-email">
          <span>Correo electrónico *</span>
          <input
            id="user-email"
            type="email"
            maxLength={254}
            autoComplete="off"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "user-email-error" : undefined}
            {...register("email")}
          />
          <FieldError id="user-email-error" message={errors.email?.message} />
        </label>

        <label htmlFor="user-role">
          <span>Rol *</span>
          {rolesLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  itemToStringLabel={(roleId) =>
                    roleOptions.find((role) => role._id === roleId)?.name ??
                    "Selecciona un rol"
                  }
                  disabled={field.disabled || roleOptions.length === 0}
                >
                  <SelectTrigger
                    id="user-role"
                    ref={field.ref}
                    aria-invalid={Boolean(errors.role)}
                    aria-describedby={errors.role ? "user-role-error" : undefined}
                    onBlur={field.onBlur}
                  >
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role._id} value={role._id}>
                        {role.name}
                        {role.active && !role.deletedAt ? "" : " (no disponible)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}
          <FieldError id="user-role-error" message={errors.role?.message} />
          {rolesError && (
            <small className="field-error" role="alert">
              No se pudieron cargar los roles: {rolesError}
            </small>
          )}
        </label>

        <label htmlFor="user-password">
          <span>{creating ? "Contraseña *" : "Nueva contraseña"}</span>
          <input
            id="user-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password ? "user-password-error" : "user-password-help"
            }
            {...register("password")}
          />
          {!errors.password && (
            <small id="user-password-help" className="muted">
              {creating
                ? "Al menos 8 caracteres; el máximo efectivo es 72 bytes UTF-8."
                : "Déjalo vacío para conservar la contraseña actual. No se puede consultar la contraseña guardada."}
            </small>
          )}
          <FieldError
            id="user-password-error"
            message={errors.password?.message}
          />
        </label>

        <label htmlFor="user-confirm-password">
          <span>{creating ? "Confirmar contraseña *" : "Confirmar nueva contraseña"}</span>
          <input
            id="user-confirm-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={
              errors.confirmPassword
                ? "user-confirm-password-error"
                : undefined
            }
            {...register("confirmPassword")}
          />
          <FieldError
            id="user-confirm-password-error"
            message={errors.confirmPassword?.message}
          />
        </label>
        {!creating && (
          <p className="full-width muted" role="note">
            Deja ambos campos vacíos para conservar la contraseña actual. No se
            puede consultar la contraseña guardada.
          </p>
        )}
      </div>

      <div className="form-actions">
        <button
          className="button"
          type="submit"
          disabled={isSaving || rolesLoading || roleOptions.length === 0}
        >
          {isSaving ? "Guardando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}