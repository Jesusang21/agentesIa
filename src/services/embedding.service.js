import 'dotenv/config';

export const embeddingService = async (data) => {
  try {
    let text = '';

    if (typeof data === 'string') {
      text = data.trim();
    } else if (data && typeof data === 'object') {
      if (data.text) {
        text = String(data.text).trim();
      } else if (data.descripcion) {
        text = data.nombre
          ? `${data.nombre}: ${data.descripcion}`.trim()
          : String(data.descripcion).trim();
      } else if (data.prompt) {
        text = String(data.prompt).trim();
      } else if (data.query) {
        text = String(data.query).trim();
      } else {
        text = JSON.stringify(data);
      }
    }

    if (!text || text.trim() === '') {
      return {
        status: 400,
        message: 'No se proporcionaron datos válidos o texto para vectorizar.'
      };
    }

    const apiKey = process.env.googleApiKey;
    if (!apiKey) {
      return {
        status: 500,
        message: "No se encontró la variable de entorno 'googleApiKey'."
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: {
          parts: [{ text }]
        },
        outputDimensionality: 768
      })
    });

    const result = await response.json();

    if (!response.ok || !result?.embedding?.values) {
      return {
        status: response.status || 500,
        message: result?.error?.message || 'Error al generar embedding'
      };
    }

    return {
      status: 200,
      message: result.embedding.values
    };
  } catch (error) {
    return {
      status: 500,
      message: `Error interno en el servicio de embedding: ${error.message}`
    };
  }
};

export default embeddingService;
