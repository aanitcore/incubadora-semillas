import { useState, useEffect, useRef } from "react";

// ── Paleta ──────────────────────────────────────────────────
// Verde-musgo oscuro como base (tierra, naturaleza, laboratorio)
// Amarillo-lima para acentos vivos (brotación, vida)
// Grises cálidos para UI neutral
// Monospace para datos de sensores = lectura de instrumento

const COLORS = {
  bg:        "#111a12",
  surface:   "#1a2b1b",
  border:    "#2a3d2b",
  accent:    "#a3e635",   // lima vivo
  accentDim: "#4d6b1a",
  text:      "#e8f0e9",
  muted:     "#6b7f6c",
  warn:      "#f59e0b",
  danger:    "#ef4444",
  ok:        "#a3e635",
};

// ── Datos reales de sensores (vía ESP32) ──────────────────────
function useSensores() {
  const [datos, setDatos] = useState({
    temperatura: "--",
    humedadAire: "--",
    humedadSuelo: "Esperando...",
    luz: "Esperando...",
    conectado: false,
  });

  useEffect(() => {
    async function leer() {
      try {
        const res = await fetch("/api/sensores");
        const data = await res.json();
        if (data.temperatura !== null) {
          setDatos({
            temperatura: data.temperatura,
            humedadAire: data.humedadAire,
            humedadSuelo: data.humedadSuelo,
            luz: data.luz,
            conectado: true,
          });
        }
      } catch {
        // Si falla, deja los datos anteriores
      }
    }
    leer();
    const id = setInterval(leer, 5000); // Revisa cada 5 segundos
    return () => clearInterval(id);
  }, []);

  return datos;
}

// ── Tarjeta de sensor ────────────────────────────────────────
function SensorCard({ label, value, unit, estado }) {
  const color = estado === "ok" ? COLORS.ok : estado === "warn" ? COLORS.warn : COLORS.danger;
  return (
    <div style={{
      background: COLORS.surface,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 10,
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 4,
    }}>
      <span style={{ fontSize: 10, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {label}
      </span>
      <span style={{ fontFamily: "monospace", fontSize: 26, fontWeight: 700, color }}>
        {value}<span style={{ fontSize: 14, marginLeft: 3, color: COLORS.muted }}>{unit}</span>
      </span>
      <span style={{ fontSize: 11, color }}>
        {estado === "ok" ? "● En rango" : estado === "warn" ? "◐ Revisar" : "○ Fuera de rango"}
      </span>
    </div>
  );
}

// ── Bloque de condición ideal ────────────────────────────────
function CondicionRow({ label, ideal, actual }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "10px 0",
      borderBottom: `1px solid ${COLORS.border}`,
    }}>
      <span style={{ color: COLORS.muted, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
      <div style={{ textAlign: "right" }}>
        <div style={{ color: COLORS.accent, fontFamily: "monospace", fontSize: 13 }}>{ideal}</div>
        {actual && <div style={{ color: COLORS.muted, fontSize: 11 }}>Actual: {actual}</div>}
      </div>
    </div>
  );
}

// ── App principal ────────────────────────────────────────────
export default function App() {
  const sensores = useSensores();
  const [semilla, setSemilla] = useState("");
  const [estado, setEstado] = useState("idle"); // idle | cargando | listo | error
  const [recomendacion, setRecomendacion] = useState(null);
  const [decision, setDecision] = useState(null); // null | aceptada | rechazada
  const inputRef = useRef();

  // Parsea la respuesta de Claude en líneas clave
  function parsearRespuesta(texto) {
    const lineas = texto.split("\n").filter(l => l.trim());
    const datos = {};
    lineas.forEach(l => {
      if (l.includes("TEMPERATURA:"))       datos.temperatura   = l.split(":")[1]?.trim();
      if (l.includes("HUMEDAD DEL AIRE:"))  datos.humedadAire   = l.split(":")[1]?.trim();
      if (l.includes("HUMEDAD DEL SUELO:")) datos.humedadSuelo  = l.split(":")[1]?.trim();
      if (l.includes("LUZ:"))              datos.luz            = l.split(":")[1]?.trim();
      if (l.includes("DÍAS ESTIMADOS:"))   datos.dias           = l.split(":")[1]?.trim();
      if (l.includes("CONSEJO CLAVE:"))    datos.consejo        = l.split(":").slice(1).join(":").trim();
    });
    return Object.keys(datos).length >= 3 ? datos : null;
  }

  async function consultarClaude() {
    if (!semilla.trim()) return;
    setEstado("cargando");
    setRecomendacion(null);
    setDecision(null);

    const prompt = `Soy un agricultor y quiero germinar semillas de: ${semilla}.
Dame SOLO las condiciones ideales de germinación en este formato exacto, sin introducción ni texto extra:
TEMPERATURA: X a Y °C
HUMEDAD DEL AIRE: X a Y %
HUMEDAD DEL SUELO: seco / moderado / húmedo
LUZ: oscuridad / luz indirecta / luz directa
DÍAS ESTIMADOS: X a Y días
CONSEJO CLAVE: (una sola frase práctica)`;

    try {
      const res = await fetch("/api/consultar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ semilla }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al consultar");
      }

      const texto = data.texto || "";
      const parsed = parsearRespuesta(texto);

      if (parsed) {
        setRecomendacion({ ...parsed, raw: texto, semilla });
        setEstado("listo");
      } else {
        setRecomendacion({ raw: texto, semilla });
        setEstado("listo");
      }
    } catch {
      setEstado("error");
    }
  }

  return (
    <div style={{
      background: COLORS.bg,
      minHeight: "100vh",
      color: COLORS.text,
      fontFamily: "-apple-system, 'Segoe UI', sans-serif",
      padding: "24px 18px",
      maxWidth: 480,
      margin: "0 auto",
    }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: COLORS.accent,
            boxShadow: `0 0 8px ${COLORS.accent}`,
          }} />
          <span style={{ fontSize: 11, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>
            Incubadora activa
          </span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, lineHeight: 1.2 }}>
          Incubadora<br />
          <span style={{ color: COLORS.accent }}>Inteligente</span>
        </h1>
        <p style={{ fontSize: 12, color: COLORS.muted, marginTop: 6 }}>
          {sensores.conectado ? "Conectado al ESP32 — datos en vivo" : "Esperando datos del ESP32..."}
        </p>
      </div>

      {/* Sensores en tiempo real */}
      <section style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
          Condiciones actuales
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <SensorCard label="Temperatura" value={sensores.temperatura} unit="°C"
            estado={sensores.temperatura >= 22 && sensores.temperatura <= 35 ? "ok" : "warn"} />
          <SensorCard label="Humedad aire" value={sensores.humedadAire} unit="%"
            estado={sensores.humedadAire >= 50 && sensores.humedadAire <= 80 ? "ok" : "warn"} />
          <SensorCard label="Humedad suelo" value={sensores.humedadSuelo} unit=""
            estado="ok" />
          <SensorCard label="Luz" value={sensores.luz} unit=""
            estado="ok" />
        </div>
      </section>

      {/* Consulta de semilla */}
      <section style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 18,
        marginBottom: 20,
      }}>
        <p style={{ fontSize: 11, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
          ¿Qué semilla vas a germinar?
        </p>
        <input
          ref={inputRef}
          value={semilla}
          onChange={e => setSemilla(e.target.value)}
          onKeyDown={e => e.key === "Enter" && consultarClaude()}
          placeholder="Ej: tabachín, Querétaro, México"
          style={{
            width: "100%",
            background: COLORS.bg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            padding: "11px 13px",
            color: COLORS.text,
            fontSize: 14,
            outline: "none",
            marginBottom: 12,
          }}
        />
        <button
          onClick={consultarClaude}
          disabled={estado === "cargando" || !semilla.trim()}
          style={{
            width: "100%",
            background: estado === "cargando" ? COLORS.accentDim : COLORS.accent,
            color: "#0f1f10",
            border: "none",
            borderRadius: 8,
            padding: "12px",
            fontSize: 14,
            fontWeight: 700,
            cursor: estado === "cargando" ? "not-allowed" : "pointer",
            transition: "background 0.2s",
          }}
        >
          {estado === "cargando" ? "⏳ Consultando a Claude..." : "Consultar condiciones ideales"}
        </button>
      </section>

      {/* Recomendación */}
      {estado === "listo" && recomendacion && !decision && (
        <section style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.accentDim}`,
          borderRadius: 12,
          padding: 18,
          marginBottom: 20,
          animation: "fadeIn 0.3s ease",
        }}>
          <p style={{ fontSize: 11, color: COLORS.accent, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
            Condiciones ideales — {recomendacion.semilla}
          </p>

          {recomendacion.temperatura && <>
            <CondicionRow label="Temperatura"   ideal={recomendacion.temperatura}  actual={`${sensores.temperatura}°C`} />
            <CondicionRow label="Humedad aire"  ideal={recomendacion.humedadAire}  actual={`${sensores.humedadAire}%`} />
            <CondicionRow label="Humedad suelo" ideal={recomendacion.humedadSuelo} actual={sensores.humedadSuelo} />
            <CondicionRow label="Luz"           ideal={recomendacion.luz}          actual={sensores.luz} />
            {recomendacion.dias    && <CondicionRow label="Días para germinar" ideal={recomendacion.dias} />}
            {recomendacion.consejo && (
              <div style={{ marginTop: 14, padding: "10px 12px", background: COLORS.bg, borderRadius: 8, borderLeft: `3px solid ${COLORS.accent}` }}>
                <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 4 }}>Consejo clave</p>
                <p style={{ fontSize: 13, color: COLORS.text }}>{recomendacion.consejo}</p>
              </div>
            )}
          </>}

          {/* Botones de decisión */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
            <button onClick={() => setDecision("aceptada")} style={{
              background: "#166534", color: "#bbf7d0", border: "1px solid #16a34a",
              borderRadius: 8, padding: "11px", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              ✅ Aceptar
            </button>
            <button onClick={() => setDecision("rechazada")} style={{
              background: "#7f1d1d", color: "#fecaca", border: "1px solid #dc2626",
              borderRadius: 8, padding: "11px", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              ✏️ Ajustar
            </button>
          </div>
        </section>
      )}

      {/* Resultado de decisión */}
      {decision && (
        <section style={{
          background: decision === "aceptada" ? "#14532d" : "#431407",
          border: `1px solid ${decision === "aceptada" ? "#16a34a" : "#c2410c"}`,
          borderRadius: 12,
          padding: 18,
          marginBottom: 20,
          textAlign: "center",
        }}>
          <p style={{ fontSize: 20, marginBottom: 6 }}>
            {decision === "aceptada" ? "✅" : "✏️"}
          </p>
          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
            {decision === "aceptada" ? "Rangos aceptados" : "Vas a ajustar tú"}
          </p>
          <p style={{ fontSize: 12, color: COLORS.muted }}>
            {decision === "aceptada"
              ? "El Arduino usará estos rangos como referencia cuando lo conectes."
              : "Puedes cambiar la semilla o ajustar los valores manualmente."}
          </p>
          <button onClick={() => { setDecision(null); setEstado("idle"); setSemilla(""); setRecomendacion(null); }}
            style={{ marginTop: 12, background: "transparent", color: COLORS.muted, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 16px", fontSize: 12, cursor: "pointer" }}>
            Nueva consulta
          </button>
        </section>
      )}

      {estado === "error" && (
        <div style={{ background: "#7f1d1d", border: "1px solid #dc2626", borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13 }}>
          Error al consultar. Revisa tu conexión e intenta de nuevo.
        </div>
      )}

      {/* Footer */}
      <p style={{ textAlign: "center", fontSize: 11, color: COLORS.border, marginTop: 10 }}>
        Marpzen · Incubadora v1.0
      </p>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
