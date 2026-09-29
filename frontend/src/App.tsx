import { useState } from "react";
import type { FormEvent } from "react";
import { getSessionUser, login, logout, register } from "./auth";
import "./App.css";
import Dashboard from "./Dashboard";

function App() {
  const [user, setUser] = useState(getSessionUser);
  const [isLogin, setIsLogin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");

    try {
      const currentUser = isLogin
        ? await login(email, password)
        : await register(
            String(data.get("fullName") ?? ""),
            email,
            password,
            String(data.get("confirmPassword") ?? ""),
          );
      setShowPassword(false);
      setUser(currentUser);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo completar la operación. Inténtalo nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
    setUser(null);
    setIsLogin(true);
    setError("");
    setShowPassword(false);
  }

  if (user) {
    return (
      <Dashboard
        user={user}
        onLogout={handleLogout}
        onBalanceUpdated={setUser}
      />
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <header>
          <p>🐌 A paso ganador</p>
          <h1>{isLogin ? "Bienvenido de nuevo" : "Crea tu cuenta"}</h1>
          <p>Consulta las estadísticas y administra tu saldo ficticio.</p>
        </header>

        <form
          key={isLogin ? "login" : "register"}
          onSubmit={handleSubmit}
          aria-busy={loading}
        >
          {!isLogin && (
            <div className="form-field">
              <label htmlFor="fullName">Nombre completo</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                disabled={loading}
                required
              />
            </div>
          )}

          <div className="form-field">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              disabled={loading}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="password">Contraseña</label>

            <div className="password-field">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isLogin ? "current-password" : "new-password"}
                minLength={8}
                disabled={loading}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                aria-controls="password confirmPassword"
                aria-pressed={showPassword}
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="form-field">
              <label htmlFor="confirmPassword">Confirmar contraseña</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                disabled={loading}
                required
              />
            </div>
          )}

          {!isLogin && <p>Utiliza al menos 8 caracteres para tu contraseña.</p>}

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}>
            {loading
              ? "Procesando…"
              : isLogin
                ? "Iniciar sesión"
                : "Crear cuenta"}
          </button>

          <button
            type="button"
            className="switch-button"
            disabled={loading}
            onClick={() => {
              setShowPassword(false);
              setIsLogin(!isLogin);
              setError("");
            }}
          >
            {isLogin
              ? "No tengo cuenta: registrarme"
              : "Ya tengo cuenta: iniciar sesión"}
          </button>
        </form>

        <p>Demostración con datos y saldo ficticios.</p>
      </section>
    </main>
  );
}

export default App;
