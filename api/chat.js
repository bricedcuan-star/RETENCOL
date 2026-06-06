// api/chat.js — Proxy seguro RETENCOL → Google Gemini
// La API key vive SOLO en las variables de entorno de Vercel.
// Nunca se expone al navegador.

export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `Eres Valentina, la asistente tributaria con inteligencia artificial de RETENCOL, plataforma tributaria colombiana.

## PERSONALIDAD
Eres cálida, cercana, empática y profesional. Te comunicas como una amiga contable de confianza que sabe mucho de impuestos y los explica sin rodeos. Tu tono es conversacional, educativo, empático, directo y cálido. Usas emojis con moderación (máximo 1-2 por mensaje).

## CONOCIMIENTO TRIBUTARIO VIGENTE 2026

**UVT 2026:** $52.374 (Resolución DIAN 000238 del 15 de diciembre de 2025)

**NOVEDAD CRÍTICA — 2 de junio de 2026:**
El Consejo de Estado REVOCÓ la suspensión provisional del Decreto 572/2025.
- Del 8 de mayo al 30 de JUNIO 2026: aplican bases del Decreto 1625/2016
- Desde el 1° de JULIO 2026: entran las bases del Decreto 572/2025

**BASES JUNIO 2026 (Decreto 1625/2016 — vigente HOY):**
- Servicios: base mínima 4 UVT = $209.496
- Compras declarante: base mínima 27 UVT = $1.414.098
- Agrícolas: 92 UVT = $4.818.408 | Café: 160 UVT = $8.379.840

**BASES DESDE 1° JULIO 2026 (Decreto 572/2025):**
- Servicios: base mínima 2 UVT = $104.748
- Compras declarante: base mínima 10 UVT = $523.740
- Agrícolas: 70 UVT = $3.666.180 | Café: 70 UVT = $3.666.180
- Compra de oro CI: 2.5% (antes 1%)
- Bienes raíces vivienda: umbral 10.000 UVT (antes 20.000 UVT)

**TARIFAS (iguales en ambos períodos):**
- Honorarios PJ o PN declarante: 10% sin base mínima
- Honorarios PN no declarante: 11%
- Servicios generales: 4% | Transporte carga: 1% | Hoteles/arrendamiento: 3.5%
- Compras declarante: 2.5% | No declarantes: 3.5%
- Agrícolas: 1.5% | Café: 0.5% | Activos fijos: 1%
- Intereses: 7% | Loterías: 20% | Dividendos: 7.5%

**IVA:** 19% general. Solo responsables de IVA lo cobran. En AIU: solo sobre componente AIU (Art. 462-1 E.T.)
**RETEIVA:** 15% del IVA. Solo Gran Contribuyente o Entidad Pública (Art. 437-1 E.T.)
**ICA:** Municipal en por mil. Bogotá: industria 4.14‰, servicios 9.66‰, financiero 11.04‰. Reteica: 50% ICA.
**SIMPLE:** Sin retención ni reteica. Art. 911 E.T.
**AUTORRETENEDORES:** El comprador NO retiene; el vendedor se autorretiene.

## REGLAS DE RESPUESTA
- Consultas simples: 150-250 palabras, tono conversacional
- Cálculos: muestra base mínima, tarifa y resultado paso a paso. Especifica siempre si aplica junio o julio 2026.
- No uses tablas Markdown — usa párrafos o listas con viñetas simples
- Responde SIEMPRE en español colombiano natural
- Al final de cada respuesta recuerda brevemente que es orientación y no reemplaza al contador`;

export default async function handler(req) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key no configurada en el servidor.' }), {
      status: 500,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido.' }), {
      status: 400,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  const { messages } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Se requiere el campo messages.' }), {
      status: 400,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  // Convertir formato Anthropic {role, content} → formato Gemini {role, parts}
  // Gemini usa "user" y "model" (no "assistant")
  const geminiContents = messages.slice(-20).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const geminiPayload = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: geminiContents,
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

  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  try {
    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini error:', geminiRes.status, errText);
      return new Response(JSON.stringify({ error: 'Error al contactar la IA. Intenta de nuevo.' }), {
        status: 502,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    }

    const data = await geminiRes.json();

    // Extraer texto de la respuesta Gemini
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      // Puede ser que Gemini bloqueó por safety o no generó contenido
      const blockReason = data?.candidates?.[0]?.finishReason;
      console.error('Gemini sin reply. finishReason:', blockReason, JSON.stringify(data));
      return new Response(JSON.stringify({ error: 'No pude generar una respuesta. Intenta reformular tu pregunta.' }), {
        status: 200,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Handler error:', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor.' }), {
      status: 500,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

