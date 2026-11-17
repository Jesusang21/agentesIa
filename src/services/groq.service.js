import 'dotenv/config';
import Groq from 'groq-sdk';

const SYSTEM_PROMPT = `Eres un agente clasificador para una tienda con catálogo y búsqueda RAG.
Analiza la solicitud del usuario y responde ÚNICAMENTE con un JSON con la estructura:
{ "action": "list_all" | "search" | "create" | "unknown",
  "search_query": string o null,
  "product_data": { "nombre": string o null, "precio": number o null,
                    "cantidad": number o null, "descripcion": string o null } }
Reglas:
1. "list_all": el usuario pide ver, listar o consultar TODOS los productos o el
   catálogo completo.
2. "search": el usuario busca, pregunta por o describe un tipo de producto o
   características deseadas.
3. "create": el usuario quiere registrar, agregar o crear un producto nuevo.
   Extrae nombre, precio, cantidad y descripcion.
4. "unknown": la petición no encaja con ninguna de las anteriores.`;

const FRIENDLY_SYSTEM_PROMPT = `Eres un asistente comercial amigable y profesional de una tienda de tecnología. Respondes siempre en español con un tono cercano, claro y empático.

Reglas obligatorias:
1. NUNCA menciones términos técnicos como vectores, embeddings, algoritmos, bases de datos ni similitud.
2. En "list_all": resume y presenta el catálogo de productos disponibles de forma atractiva y organizada.
3. En "search": explica brevemente por qué las opciones encontradas encajan con lo que busca el cliente, mencionando nombre, precio y beneficios.
4. En "create" exitoso: felicita y confirma amablemente el registro del producto.
5. Si faltan datos: explica con claridad y amabilidad qué datos específicos se necesitan.
6. En "unknown": orienta cordialmente al cliente sobre lo que puede pedir (ver el catálogo completo, buscar productos según su necesidad o registrar un nuevo producto).
7. Mantén la respuesta corta pero amable.`;

/**
 * Clasifica la intención del usuario usando Groq.
 * @param {string} userText - Mensaje o solicitud del usuario.
 * @param {Object} [payload={}] - Datos adicionales asociados a la solicitud.
 * @returns {Promise<{ status: number, message: any }>}
 */
export const classifyIntent = async (userText, payload = {}) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return {
        status: 500,
        message: "No se encontró la variable de entorno 'GROQ_API_KEY'."
      };
    }

    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: JSON.stringify({
            mensaje_usuario: userText,
            datos_adicionales: payload
          })
        }
      ]
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return {
        status: 500,
        message: 'No se recibió contenido en la respuesta de Groq.'
      };
    }

    const parsed = JSON.parse(content);

    return {
      status: 200,
      message: parsed
    };
  } catch (error) {
    return {
      status: 500,
      message: `Error al clasificar intención con Groq: ${error.message}`
    };
  }
};

/**
 * Genera una respuesta amigable en lenguaje natural para el cliente.
 * @param {Object} params
 * @param {string} params.userText - Consulta original del cliente.
 * @param {string} params.action - Acción realizada ('list_all' | 'search' | 'create' | 'unknown').
 * @param {any} [params.results] - Datos relevantes obtenidos.
 * @param {any} [params.errorDetails] - Detalles adicionales o de error.
 * @returns {Promise<string>}
 */
export const generateFriendlyResponse = async ({ userText, action, results, errorDetails } = {}) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return "¡Hola! Hemos procesado tu solicitud. A continuación encontrarás la información correspondiente.";
    }

    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        {
          role: 'system',
          content: FRIENDLY_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: JSON.stringify({
            consulta_del_cliente: userText,
            accion_realizada: action,
            datos_relevantes: results,
            detalles_adicionales: errorDetails
          })
        }
      ]
    });

    const content = completion.choices[0]?.message?.content;

    if (!content || content.trim() === '') {
      return "¡Hola! Aquí tienes la información sobre los productos solicitados.";
    }

    return content.trim();
  } catch (error) {
    return "¡Hola! Hemos procesado tu solicitud. A continuación encontrarás la información correspondiente.";
  }
};

export default { classifyIntent, generateFriendlyResponse };
