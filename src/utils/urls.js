const CATALOG_PATH = "/catalogo/";
const PRODUCT_PATH = "/catalogo/producto/";

export function createProductUrl(productId) {
  const url = new URL(PRODUCT_PATH, window.location.origin);

  url.searchParams.set("id", String(productId));

  return `${url.pathname}${url.search}`;
}

export function createCatalogUrl(parameters = {}) {
  const url = new URL(CATALOG_PATH, window.location.origin);

  Object.entries(parameters).forEach(([parameterName, value]) => {
    if (
      value === undefined ||
      value === null ||
      String(value).trim() === ""
    ) {
      return;
    }

    url.searchParams.set(parameterName, String(value).trim());
  });

  return `${url.pathname}${url.search}`;
}
