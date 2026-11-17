import { createProductModel, getProductsModel, getNearestProductsModel } from '../models/product.model.js';
import { embeddingService } from './embedding.service.js';
import { rerankerService } from './reranker.service.js';

/**
 * Limpia un producto eliminando los campos embedding y vectorSimilarity.
 * @param {Object} product
 * @returns {Object}
 */
const cleanProductData = (product) => {
  if (!product) return product;
  const { embedding, vectorSimilarity, ...rest } = product;
  return rest;
};

/**
 * Valida, vectoriza y crea un nuevo producto en la base de datos.
 * @param {Object} productData
 * @returns {Promise<{ status: number, message: any }>}
 */
export const createProductService = async (productData) => {
  try {
    if (
      !productData ||
      !productData.nombre ||
      !productData.descripcion ||
      productData.precio === undefined ||
      productData.cantidad === undefined ||
      String(productData.nombre).trim() === '' ||
      String(productData.descripcion).trim() === ''
    ) {
      return {
        status: 400,
        message: 'Datos incompletos. Se requieren: nombre, precio, cantidad y descripcion.'
      };
    }

    let embedding = productData.embedding;

    if (!embedding) {
      const embeddingResult = await embeddingService({
        nombre: productData.nombre,
        descripcion: productData.descripcion
      });

      if (embeddingResult.status !== 200) {
        return {
          status: embeddingResult.status,
          message: embeddingResult.message
        };
      }

      embedding = embeddingResult.message;
    }

    const nuevo = await createProductModel({
      nombre: String(productData.nombre).trim(),
      descripcion: String(productData.descripcion).trim(),
      precio: Number(productData.precio),
      cantidad: Number(productData.cantidad),
      embedding
    });

    return {
      status: 201,
      message: cleanProductData(nuevo)
    };
  } catch (error) {
    return {
      status: 500,
      message: `Error interno al crear el producto: ${error.message}`
    };
  }
};

/**
 * Obtiene todos los productos de la base de datos sin datos vectoriales.
 * @returns {Promise<{ status: number, message: any }>}
 */
export const getProductsService = async () => {
  try {
    const products = await getProductsModel();
    const cleaned = products.map(cleanProductData);

    return {
      status: 200,
      message: cleaned
    };
  } catch (error) {
    return {
      status: 500,
      message: `Error interno al obtener los productos: ${error.message}`
    };
  }
};

/**
 * Búsqueda semántica y reranking de productos.
 * @param {string} query - Texto de búsqueda.
 * @param {number} [limit=5] - Cantidad de productos a retornar.
 * @returns {Promise<{ status: number, message: any }>}
 */
export const searchProductsService = async (query, limit = 5) => {
  try {
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return {
        status: 400,
        message: 'Se requiere un texto o consulta válida para realizar la búsqueda.'
      };
    }

    const embeddingResult = await embeddingService(query.trim());
    if (embeddingResult.status !== 200) {
      return {
        status: embeddingResult.status,
        message: embeddingResult.message
      };
    }

    const vector = embeddingResult.message;
    const candidatePoolSize = Math.max(limit * 2, 10);
    const candidates = await getNearestProductsModel(vector, candidatePoolSize);

    if (!candidates || candidates.length === 0) {
      return {
        status: 200,
        message: []
      };
    }

    const documents = candidates.map(
      (c) => `${c.nombre}: ${c.descripcion}. Precio: $${c.precio}. Stock: ${c.cantidad}`
    );

    const rerankResult = await rerankerService({
      query: query.trim(),
      documents,
      top_n: limit
    });

    if (rerankResult.status === 200 && Array.isArray(rerankResult.message)) {
      const results = rerankResult.message.map((item) => ({
        ...cleanProductData(candidates[item.index]),
        relevanceScore: item.relevance_score
      }));

      return {
        status: 200,
        message: results
      };
    }

    // Fallback: si el reranker falla, retorna candidates.slice(0, limit) limpios
    return {
      status: 200,
      message: candidates.slice(0, limit).map(cleanProductData)
    };
  } catch (error) {
    return {
      status: 500,
      message: `Error interno en la búsqueda de productos: ${error.message}`
    };
  }
};
