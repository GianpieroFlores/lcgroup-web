export function normalizeSlug(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createProductSlug(product, products = []) {
  const override = normalizeSlug(product?.slug);
  const baseSlug = override || normalizeSlug(product?.name) || "producto";
  const hasCollision = products.some((candidate) => (
    String(candidate?.id) !== String(product?.id) &&
    (normalizeSlug(candidate?.slug) || normalizeSlug(candidate?.name)) === baseSlug
  ));

  if (!hasCollision) return baseSlug;

  const stableSuffix = normalizeSlug(product?.sku) || normalizeSlug(product?.id);
  return stableSuffix ? `${baseSlug}-${stableSuffix}` : baseSlug;
}

export function findProductBySlug(products, slug) {
  const normalizedSlug = normalizeSlug(slug);
  return products.find((product) => (
    createProductSlug(product, products) === normalizedSlug
  ));
}
