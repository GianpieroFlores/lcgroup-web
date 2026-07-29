export function normalizeSearchText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function getProductSearchText(product) {
  return normalizeSearchText(
    [product.name, product.brand, product.sku].filter(Boolean).join(" "),
  );
}
