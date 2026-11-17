"use client";
import { useEffect, useState } from "react";
import { money } from "@/lib/config";

// Contador propio: agregados al pedido y "Solicitar por WhatsApp", día por día (últimos 30 días).
export default function Metrics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/metrics").then(async (res) => {
      if (res.ok) setData(await res.json());
      else setError(res.status === 401 ? "login" : "No se pudieron cargar las métricas.");
    });
  }, []);

  if (error === "login")
    return <section className="wrap page"><p>Inicia sesión primero. <a href="/admin/images">Ir al administrador</a></p></section>;
  if (error) return <section className="wrap page"><p className="admin-status is-error">{error}</p></section>;
  if (!data) return <section className="wrap page"><p className="muted">Cargando…</p></section>;

  const sum = (days, k) => days.reduce((n, d) => n + d[k], 0);
  const week = data.days.slice(0, 7);
  const top = Object.entries(data.days.reduce((acc, d) => {
    for (const [c, u] of Object.entries(d.products)) acc[c] = (acc[c] || 0) + u;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 10);

  return (
    <section className="wrap page admin">
      <div className="admin-top">
        <div>
          <h1 className="page-title">Métricas del pedido</h1>
          <p className="muted">Cuántos agregan productos al pedido y cuántos tocan “Solicitar por WhatsApp”. Hora de Guatemala.</p>
        </div>
        <a className="btn btn-secondary" href="/admin/images">Volver a fotografías</a>
      </div>

      <div className="metrics-cards">
        <Card n={data.days[0].add} label="Agregados hoy" />
        <Card n={data.days[0].whatsapp} label="Pedidos por WhatsApp hoy" />
        <Card n={sum(week, "add")} label="Agregados (7 días)" />
        <Card n={sum(week, "whatsapp")} label="Pedidos WhatsApp (7 días)" />
      </div>

      <div className="metrics-scroll">
        <table className="metrics-table">
          <thead>
            <tr><th>Día</th><th>Agregados</th><th>Unidades</th><th>WhatsApp</th><th>Unidades</th><th>Total estimado</th></tr>
          </thead>
          <tbody>
            {data.days.map((d) => (
              <tr key={d.date}>
                <td>{d.date}</td><td>{d.add}</td><td>{d.addUnits}</td><td>{d.whatsapp}</td><td>{d.whatsappUnits}</td><td>{money(d.whatsappTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="admin-h3">Más agregados al pedido (30 días, en unidades)</h2>
      {top.length ? (
        <div className="metrics-scroll">
          <table className="metrics-table">
            <tbody>
              {top.map(([c, u]) => <tr key={c}><td>{c} · {data.names[c] || ""}</td><td>{u}</td></tr>)}
            </tbody>
          </table>
        </div>
      ) : <p className="muted">Todavía no hay datos.</p>}
    </section>
  );
}

const Card = ({ n, label }) => <div className="metrics-card"><strong>{n}</strong><span>{label}</span></div>;
