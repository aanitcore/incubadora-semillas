// api/sensores.js
// Recibe datos del ESP32 (POST) y los entrega al dashboard (GET)
// Usa una variable en memoria — se reinicia si Vercel "duerme" la función,
// pero para uso personal funciona bien la mayor parte del tiempo.

let ultimaLectura = {
  temperatura: null,
  humedadAire: null,
  humedadSuelo: "Sin datos",
  luz: "Sin datos",
  ultimaActualizacion: null,
};

export default function handler(req, res) {
  if (req.method === "POST") {
    // El ESP32 manda datos nuevos
    const { temperatura, humedadAire, humedadSuelo, luz } = req.body;

    ultimaLectura = {
      temperatura,
      humedadAire,
      humedadSuelo,
      luz,
      ultimaActualizacion: new Date().toISOString(),
    };

    return res.status(200).json({ ok: true });
  }

  if (req.method === "GET") {
    // El dashboard pide los datos más recientes
    return res.status(200).json(ultimaLectura);
  }

  return res.status(405).json({ error: "Método no permitido" });
}
