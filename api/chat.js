// api/chat.js — Proxy seguro RETENCOL → Google Gemini
// Runtime: Node.js (más compatible con Vercel que edge)

const SYSTEM_PROMPT = `Eres Valentina, la asistente tributaria con inteligencia artificial de RETENCOL, plataforma tributaria colombiana.

Eres cálida, cercana, empática y profesional. Te comunicas como una amiga contable de confianza. Tono conversacional, educativo y directo. Emojis con moderación (máximo 1-2 por mensaje).

## CONOCIMIENTO TRIBUTARIO VIGENTE 2026

UVT 2026: $52.374

NOVEDAD 2 junio 2026: El Consejo de Estado revocó la suspensión del Decreto 572/2025.
- Junio 2026: bases Decreto 1625/2016 (Servicios 4 UVT=$209.496 · Compras 27 UVT=$1.414.098)
- Desde 1° julio 2026: bases Decreto 572/2025 (Servicios 2 UVT=$104.748 · Compras 10 UVT=$523.740)

TARIFAS (no cambian entre períodos):
- Honorarios PJ/PN declarante: 10% sin base mínima
- Honorarios no declarante: 11%
- Servicios: 4% | Transporte carga: 1% | Arrendamiento: 3.5%
- Compras declarante: 2.5% | No declarantes: 3.5%
- Agrícolas: 1.5% | Café: 0.5% | Activos fijos: 1%
- Intereses: 7% | Loterías: 20% | Dividendos: 7.5%

IVA: 19%. Reteiva: 15% del IVA solo para Grandes Contribuyentes/Entidades Públicas.
ICA: municipal en por mil. Bogotá servicios: 9.66‰. Reteica: 50% del ICA.
SIMPLE: sin retención ni reteica. Art. 911 E.T.
Autorretenedores: el comprador NO retiene.

REGLAS: responde en español colombiano natural, sin tablas Markdown. Para cálculos muestra paso a paso. Siempre aclara si aplica junio o julio 2026. Al final recuerda brevemente que es orientación y no reemplaza al contador.`;

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY no está definida en las variables de entorno');
    return res.status(500).json({ error: 'API key no configurada en el servidor.' });
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Se requiere el campo messages.' });
  }

  // Convertir formato {role, content} → formato Gemini {role, parts}
  const geminiContents = messages.slice(-20).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m.content) }],
  }));

  // Gemini requiere que el primer mensaje sea "user" y que alternen
  const cleanedContents = [];
  for (const msg of geminiContents) {
    const last = cleanedContents[cleanedContents.length - 1];
    if (last && last.role === msg.role) {
      last.parts[0].text += '\n' + msg.parts[0].text;
    } else {
      cleanedContents.push({ ...msg, parts: [{ text: msg.parts[0].text }] });
    }
  }

  if (cleanedContents.length > 0 && cleanedContents[0].role !== 'user') {
    cleanedContents.shift();
  }

  if (cleanedContents.length === 0) {
    return res.status(400).json({ error: 'No hay mensajes válidos para procesar.' });
  }

  // CORRECCIÓN AQUÍ: Cambiado system_instruction por systemInstruction (exigido por API v1)
  const geminiPayload = {
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: cleanedContents,
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.7,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };

  // CORRECCIÓN AQUÍ: Ruta v1 limpia y oficial
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload),
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error('Gemini HTTP error:', geminiRes.status, JSON.stringify(data));
      return res.status(502).json({ error: `Error Gemini ${geminiRes.status}: ${data?.error?.message || 'Sin detalle'}` });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      const reason = data?.candidates?.[0]?.finishReason || 'desconocido';
      console.error('Gemini sin texto. finishReason:', reason, JSON.stringify(data));
      return res.status(200).json({ error: `Sin respuesta de la IA (razón: ${reason}). Intenta de nuevo.` });
    }

    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Error en handler:', err.message, err.stack);
    return res.status(500).json({ error: 'Error interno del servidor: ' + err.message });
  }
}
