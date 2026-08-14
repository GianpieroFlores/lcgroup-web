import allProducts from "../data/products.json";
import {
  findProductById,
  getVisibleProducts,
  isProductVisible,
} from "./products.js";
import { createProductSlug, normalizeSlug } from "./product-slugs.js";

const CATALOG_PATH = "/catalogo/";
const products = getVisibleProducts(allProducts);

export function createProductUrl(productOrId) {
  const product = typeof productOrId === "object"
    ? productOrId
    : findProductById(products, productOrId);

  if (!product || !isProductVisible(product)) return CATALOG_PATH;
  return `/productos/${createProductSlug(product, products)}/`;
}

export function createCatalogUrl(parameters = {}) {
  const entries = Object.entries(parameters).filter(([, value]) => (
    value !== undefined && value !== null && String(value).trim() !== ""
  ));

  if (entries.length === 1 && entries[0][0] === "categoria") {
    return `/catalogo/${normalizeSlug(entries[0][1])}/`;
  }

  if (entries.length === 1 && entries[0][0] === "coleccion") {
    return `/colecciones/${normalizeSlug(entries[0][1])}/`;
  }

  if (entries.length === 1 && entries[0][0] === "vista" && entries[0][1] === "colecciones") {
    return "/colecciones/";
  }

  const url = new URL(CATALOG_PATH, window.location.origin);
  entries.forEach(([parameterName, value]) => {
    url.searchParams.set(parameterName, String(value).trim());
  });
  return `${url.pathname}${url.search}`;
}
