import { Link, useNavigate } from "react-router-dom";

import UserForm from "@/features/users/components/UserForm";
import { useUsers } from "@/hooks/useUsers";

export default function UserCreate() {
  const navigate = useNavigate();
  const { createUser, submitting } = useUsers();

  // La contraseña se envía una vez para crear la cuenta; el backend nunca la devuelve.
  async function create(data) {
    const user = await createUser(data);
    if (user) navigate("/users");
  }

  return (
    <section>
      <Link className="back-link" to="/users">
        ← Volver a usuarios
      </Link>
      <div className="page-header compact">
        <div>
          <p className="eyebrow">NUEVO</p>
          <h1>Crear usuario</h1>
          <p className="muted">Añade una cuenta y asigna un rol disponible.</p>
        </div>
      </div>
      <UserForm
        creating
        onSubmit={create}
        submitLabel="Crear usuario"
        submitting={submitting}
      />
    </section>
  );
}