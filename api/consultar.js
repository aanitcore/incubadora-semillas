// api/consultar.js
// Serverless Function de Vercel — corre en el servidor, no en el navegador
// Usa Groq API (gratis, sin tarjeta, corre modelos Llama de Meta)

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
    const respuesta = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
      }),
    });

    if (!respuesta.ok) {
      const errorTexto = await respuesta.text();
      console.error("Error de Groq API:", errorTexto);
      return res.status(500).json({ error: "Error al consultar Groq API" });
    }

    const data = await respuesta.json();
    const texto = data.choices?.[0]?.message?.content || "";

    return res.status(200).json({ texto });

  } catch (error) {
    console.error("Error interno:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
