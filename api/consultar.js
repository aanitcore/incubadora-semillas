// api/consultar.js
// Serverless Function de Vercel — corre en el servidor, no en el navegador
// Aquí SÍ es seguro usar la API key porque nunca la ve el usuario

export default async function handler(req, res) {
  // Solo aceptar peticiones POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { semilla } = req.body;

  if (!semilla || !semilla.trim()) {
    return res.status(400).json({ error: "Falta el nombre de la semilla" });
  }

  const prompt = `Soy un agricultor y quiero germinar semillas de: ${semilla}.
Dame SOLO las condiciones ideales de germinación en este formato exacto, sin introducción ni texto extra:
TEMPERATURA: X a Y °C
HUMEDAD DEL AIRE: X a Y %
HUMEDAD DEL SUELO: seco / moderado / húmedo
LUZ: oscuridad / luz indirecta / luz directa
DÍAS ESTIMADOS: X a Y días
CONSEJO CLAVE: (una sola frase práctica)`;

  try {
    const respuesta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CLAUDE_API_KEY, // Variable de entorno, segura
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!respuesta.ok) {
      const errorTexto = await respuesta.text();
      console.error("Error de Claude API:", errorTexto);
      return res.status(500).json({ error: "Error al consultar Claude API" });
    }

    const data = await respuesta.json();
    const texto = data.content?.[0]?.text || "";

    return res.status(200).json({ texto });

  } catch (error) {
    console.error("Error interno:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
