import RechargeForm from "./RechargeForm";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { User } from "./auth";
import "./Dashboard.css";

type DashboardProps = {
  user: User;
  onLogout: () => void;
  onBalanceUpdated: (user: User) => void;
};

const snails = [
  { name: "Turbo", wins: 2 },
  { name: "Rayo", wins: 1 },
  { name: "Canela", wins: 0 },
  { name: "Flecha", wins: 2 },
  { name: "Luna", wins: 1 },
  { name: "Trueno", wins: 0 },
];

const bets = [
  { name: "Ganadas", value: 4, fill: "#28734e" },
  { name: "Perdidas", value: 2, fill: "#e6a04b" },
];

export default function Dashboard({
  user,
  onLogout,
  onBalanceUpdated,
}: DashboardProps) {
  const balance = user.balance.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div className="brand">🐌 A paso ganador</div>

        <button type="button" className="logout-button" onClick={onLogout}>
          Cerrar sesión
        </button>
      </header>

      <section className="dashboard-intro">
        <p className="eyebrow">TU RESUMEN DEL DÍA</p>
        <h1>Hola, {user.fullName}</h1>
        <p>Consulta tus resultados y administra tu saldo en un solo lugar.</p>
        <span className="demo-badge">Demostración · Datos ficticios</span>
      </section>

      <section className="stats-grid" aria-label="Resumen">
        <article className="stat-card balance-card">
          <p>Saldo disponible</p>
          <h2>{balance}</h2>
          <span>Saldo ficticio de tu cuenta</span>
        </article>

        <article className="stat-card">
          <p>Carreras del día</p>
          <h2>6</h2>
          <span>Una victoria por carrera</span>
        </article>

        <article className="stat-card">
          <p>Caracoles participantes</p>
          <h2>6</h2>
          <span>Conoce sus resultados abajo</span>
        </article>
      </section>

      <section className="charts-grid" aria-label="Estadísticas">
        <article className="chart-card">
          <h2>Tus apuestas</h2>
          <p>Una apuesta simulada por carrera: 4 ganadas y 2 perdidas.</p>

          <div
            className="chart-container"
            role="img"
            aria-label="Apuestas simuladas: 4 ganadas y 2 perdidas."
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bets}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="55%"
                  outerRadius="80%"
                  paddingAngle={4}
                  isAnimationActive={false}
                />
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="chart-card">
          <h2>Victorias por caracol</h2>
          <p>Resultados de las seis carreras del día simulado.</p>

          <div
            className="chart-container"
            role="img"
            aria-label="Victorias: Turbo 2, Rayo 1, Canela 0, Flecha 2, Luna 1 y Trueno 0."
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={snails}
                margin={{ top: 16, right: 8, left: -24, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  tickLine={false}
                />
                <YAxis allowDecimals={false} domain={[0, 6]} tickLine={false} />
                <Tooltip cursor={{ fill: "#edf5ef" }} />
                <Bar
                  dataKey="wins"
                  name="Victorias"
                  fill="#28734e"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={44}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>
      <RechargeForm user={user} onBalanceUpdated={onBalanceUpdated} />
      <footer className="dashboard-footer">
        Las estadísticas son demostrativas y no modifican tu saldo.
      </footer>
    </main>
  );
}
