export function normalizeSearchText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function getProductSearchText(product) {
  return normalizeSearchText(
    [
      product.name,
      product.sku,
      product.collection,
      product.category,
      product.description,
      ...(Array.isArray(product.recommendedFor) ? product.recommendedFor : []),
    ]
      .filter(Boolean)
      .join(" "),
  );
}
