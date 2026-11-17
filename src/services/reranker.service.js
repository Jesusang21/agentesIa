import 'dotenv/config';

/**
 * Servicio de reranking usando la API de Jina.
 * @param {Object} params
 * @param {string} params.query - Consulta de búsqueda.
 * @param {Array<string|Object>} params.documents - Lista de documentos a reordenar.
 * @param {number} [params.top_n] - Cantidad de mejores resultados a retornar.
 * @returns {Promise<{ status: number, message: any }>}
 */
export const rerankerService = async ({ query, documents, top_n } = {}) => {
  try {
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return {
        status: 400,
        message: 'No se proporcionó una consulta válida para el reranker.'
      };
    }

    if (!Array.isArray(documents) || documents.length === 0) {
      return {
        status: 400,
        message: 'No se proporcionó una lista de documentos válida para reordenar.'
      };
    }

    const apiKey = process.env.jinaApiKey;
    if (!apiKey) {
      return {
        status: 500,
        message: "No se encontró la variable de entorno 'jinaApiKey'."
      };
    }

    const formattedDocuments = documents.map((doc) => {
      if (typeof doc === 'string') return doc;
      if (doc && typeof doc === 'object') {
        if (doc.text) return String(doc.text);
        if (doc.descripcion) {
          return doc.nombre ? `${doc.nombre}: ${doc.descripcion}` : String(doc.descripcion);
        }
        return JSON.stringify(doc);
      }
      return String(doc);
    });

    const response = await fetch('https://api.jina.ai/v1/rerank', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'jina-reranker-v2-base-multilingual',
        query: query.trim(),
        documents: formattedDocuments,
        top_n: top_n || documents.length
      })
    });

    const data = await response.json();

    if (!response.ok || !data?.results) {
      return {
        status: response.status || 500,
        message: data?.message || data?.detail || 'Error al reordenar los documentos.'
      };
    }

    return {
      status: 200,
      message: data.results
    };
  } catch (error) {
    return {
      status: 500,
      message: `Error interno en el servicio reranker: ${error.message}`
    };
  }
};

export default rerankerService;
