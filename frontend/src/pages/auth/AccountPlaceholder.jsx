import ThemeSelector from "@/components/ThemeSelector";
import { useAuth } from "@/providers/AuthProvider";

// Vista privada provisional para clientes, sin navegación administrativa.
export default function AccountPlaceholder() {
  const { user, signOut } = useAuth();

  return (
    <main className="login-page">
      <div className="login-content">
        <div className="login-header">
          <strong className="login-brand">Fixly</strong>
          <ThemeSelector />
        </div>
        <h1>Mi cuenta</h1>
        <p>Hola, {user.name}.</p>
        <button className="button" type="button" onClick={signOut}>
          Cerrar sesión
        </button>
      </div>
    </main>
  );
}