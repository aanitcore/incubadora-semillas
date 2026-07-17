// api/consultar.js
// Serverless Function de Vercel — corre en el servidor, no en el navegador
// Usa Google Gemini API (free tier: 1,500 solicitudes/día, sin tarjeta)

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
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const respuesta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!respuesta.ok) {
      const errorTexto = await respuesta.text();
      console.error("Error de Gemini API:", errorTexto);
      return res.status(500).json({ error: "Error al consultar Gemini API" });
    }

    const data = await respuesta.json();
    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return res.status(200).json({ texto });

  } catch (error) {
    console.error("Error interno:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
