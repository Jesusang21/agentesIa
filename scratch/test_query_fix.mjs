import 'dotenv/config';
import Groq from 'groq-sdk';
import { searchProductsService } from '../src/services/product.service.js';

const SYSTEM_PROMPT = `Eres un agente clasificador para una tienda con catálogo y búsqueda RAG.
Analiza la solicitud del usuario y responde ÚNICAMENTE con un JSON con la estructura:
{
  "action": "list_all" | "search" | "create" | "unknown",
  "search_query": string o null,
  "limit": number o null,
  "product_data": {
    "nombre": string o null,
    "precio": number o null,
    "cantidad": number o null,
    "descripcion": string o null
  }
}

Reglas:
1. "limit":
   - Si el usuario pide "solo 1", "el mejor", "el primero", asigna 1.
   - Si pide una cantidad específica como "2 opciones", "top 3", "dame 4", extrae ese número entero.
   - Si no indica cantidad, asigna null (se usará el valor por defecto).
2. "search_query":
   - Limpia la consulta eliminando cuantificadores, órdenes de límite y palabras de relleno.
   - Transforma la intención del usuario en términos de búsqueda semántica optimizados para el catálogo de productos (ejemplo: "solo 1 producto para sentarme" -> "silla o asiento para sentarse").
3. "action":
   - "list_all": ver o listar todo el catálogo.
   - "search": búsqueda o recomendación de productos según necesidad.
   - "create": registro de un producto nuevo.
   - "unknown": ninguna de las anteriores.`;

const classifyWithLimit = async (userText) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("No se encontró la variable de entorno 'GROQ_API_KEY'.");
  }

  const groq = new Groq({ apiKey });

  const completion = await groq.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify({ mensaje_usuario: userText }) }
    ]
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No se recibió contenido en la respuesta de Groq.');
  }

  return JSON.parse(content);
};

const runExperiment = async () => {
  const query = 'solo 1 producto para sentarme';
  console.log(`\n=== EXPERIMENTO DE BÚSQUEDA Y RERANKING ===`);
  console.log(`Consulta original: "${query}"\n`);

  try {
    console.log('1. Clasificando intención y extrayendo limit con Groq...');
    const classification = await classifyWithLimit(query);
    console.log('Clasificación obtenida:', JSON.stringify(classification, null, 2));

    const finalLimit = classification.limit || 3;
    const cleanQuery = classification.search_query || query;

    console.log(`\n2. Ejecutando búsqueda semántica con query limpia: "${cleanQuery}" y límite: ${finalLimit}...`);
    const searchResult = await searchProductsService(cleanQuery, finalLimit);

    if (searchResult.status !== 200) {
      console.error('Error en searchProductsService:', searchResult.message);
      return;
    }

    console.log(`\n3. Productos encontrados (${searchResult.message.length}):`);
    searchResult.message.forEach((producto, index) => {
      console.log(`\n[#${index + 1}] ${producto.nombre} - $${producto.precio}`);
      console.log(`    Relevance Score: ${producto.relevanceScore}`);
      console.log(`    Descripción: ${producto.descripcion}`);
    });

    console.log('\n=== FIN DEL EXPERIMENTO ===\n');
  } catch (error) {
    console.error('Error durante el experimento:', error);
  }
};

runExperiment();
