import { db } from '../prisma/db.ts';

/**
 * Crea un producto en la base de datos.
 * @param {Object} data - Datos del producto.
 * @returns {Promise<Object>}
 */
export const createProductModel = (data) => db.orm.public.Producto.create(data);

/**
 * Obtiene todos los productos de la base de datos.
 * @returns {Promise<Array>}
 */
export const getProductsModel = () => db.orm.public.Producto.all().toArray();

/**
 * Busca productos por cercanía de vector usando pgvector.
 * @param {number[]} vector - Vector de embedding.
 * @param {number} [limit=10] - Límite de resultados.
 * @returns {Promise<Array>}
 */
export const getNearestProductsModel = (vector, limit = 10) =>
  db.orm.public.Producto.using.embedding_nearest(vector).limit(limit).all().toArray();
