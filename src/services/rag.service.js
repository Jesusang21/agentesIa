import { getProductsService, createProductService, searchProductsService } from './product.service.js';
import { classifyIntent, generateFriendlyResponse } from './groq.service.js';

const OPCIONES_DISPONIBLES = [
  "1. Consultar todos los productos (ej: 'muéstrame todos los productos')",
  "2. Búsqueda semántica (ej: 'busco auriculares con cancelación de ruido')",
  "3. Agregar producto (requiere: nombre, precio, cantidad y descripcion)"
];

/**
 * Orquestador principal del servicio RAG.
 * @param {Object|string} payload - Datos de la petición del cliente.
 * @returns {Promise<{ status: number, message: any }>}
 */
export const ragService = async (payload) => {
  try {
    const userText = (
      payload?.prompt ||
      payload?.query ||
      payload?.message ||
      payload?.mensaje ||
      payload?.text ||
      (typeof payload === 'string' ? payload : '') ||
      ''
    ).trim();

    const isPayloadEmpty =
      !payload ||
      (typeof payload === 'object' && Object.keys(payload).length === 0) ||
      (typeof payload === 'string' && payload.trim() === '');

    if (!userText && isPayloadEmpty) {
      const respuesta = await generateFriendlyResponse({
        userText: '',
        action: 'unknown',
        results: null,
        errorDetails: 'Solicitud vacía'
      });

      return {
        status: 400,
        message: {
          respuesta,
          opciones_disponibles: OPCIONES_DISPONIBLES
        }
      };
    }

    const intentResult = await classifyIntent(userText, payload);

    if (intentResult.status !== 200) {
      return {
        status: intentResult.status,
        message: {
          error: intentResult.message
        }
      };
    }

    const { action, search_query, product_data } = intentResult.message || {};

    switch (action) {
      case 'list_all': {
        const listRes = await getProductsService();
        if (listRes.status !== 200) {
          return listRes;
        }

        const respuesta = await generateFriendlyResponse({
          userText,
          action: 'list_all',
          results: listRes.message
        });

        return {
          status: 200,
          message: {
            respuesta,
            total: listRes.message.length,
            productos: listRes.message
          }
        };
      }

      case 'search': {
        const queryToSearch = search_query || userText;
        const searchRes = await searchProductsService(queryToSearch, 5);
        if (searchRes.status !== 200) {
          return searchRes;
        }

        const respuesta = await generateFriendlyResponse({
          userText,
          action: 'search',
          results: searchRes.message
        });

        return {
          status: 200,
          message: {
            respuesta,
            total_encontrados: searchRes.message.length,
            productos: searchRes.message
          }
        };
      }

      case 'create': {
        const rawData = payload && typeof payload === 'object' ? payload : {};
        const extracted = product_data || {};

        const nombre = rawData.nombre ?? extracted.nombre;
        const descripcion = rawData.descripcion ?? extracted.descripcion;
        const precioRaw = rawData.precio ?? extracted.precio;
        const cantidadRaw = rawData.cantidad ?? extracted.cantidad;

        const precio =
          precioRaw !== undefined && precioRaw !== null && precioRaw !== ''
            ? Number(precioRaw)
            : undefined;
        const cantidad =
          cantidadRaw !== undefined && cantidadRaw !== null && cantidadRaw !== ''
            ? Number(cantidadRaw)
            : undefined;

        const campos_faltantes = [];
        if (!nombre || String(nombre).trim() === '') campos_faltantes.push('nombre');
        if (precio === undefined || isNaN(precio)) campos_faltantes.push('precio');
        if (cantidad === undefined || isNaN(cantidad)) campos_faltantes.push('cantidad');
        if (!descripcion || String(descripcion).trim() === '') campos_faltantes.push('descripcion');

        if (campos_faltantes.length > 0) {
          const respuesta = await generateFriendlyResponse({
            userText,
            action: 'create',
            results: null,
            errorDetails: { campos_faltantes }
          });

          return {
            status: 400,
            message: {
              respuesta,
              campos_faltantes,
              campos_requeridos: [
                'nombre (string)',
                'precio (number)',
                'cantidad (number)',
                'descripcion (string)'
              ],
              ejemplo: {
                prompt: 'Crear producto',
                nombre: 'Monitor 27 pulgadas',
                precio: 199.99,
                cantidad: 15,
                descripcion: 'Monitor IPS Full HD con bordes delgados'
              }
            }
          };
        }

        const createRes = await createProductService({
          nombre,
          precio,
          cantidad,
          descripcion,
          embedding: rawData.embedding
        });

        if (createRes.status !== 201) {
          return createRes;
        }

        const respuesta = await generateFriendlyResponse({
          userText,
          action: 'create',
          results: createRes.message
        });

        return {
          status: 201,
          message: {
            respuesta,
            producto: createRes.message
          }
        };
      }

      default: {
        const respuesta = await generateFriendlyResponse({
          userText,
          action: 'unknown',
          results: null
        });

        return {
          status: 400,
          message: {
            respuesta,
            opciones_disponibles: OPCIONES_DISPONIBLES
          }
        };
      }
    }
  } catch (error) {
    return {
      status: 500,
      message: {
        error: `Error interno en el servicio RAG: ${error.message}`
      }
    };
  }
};

export default ragService;
