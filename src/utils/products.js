const DRINK_LABELS = {
  "vino-tinto": "Vino tinto",
  "vino-blanco": "Vino blanco",
  champagne: "Champagne",
  cocteles: "Cócteles",
  agua: "Agua y bebidas",
  cerveza: "Cerveza",
  whisky: "Whisky",
  pisco: "Pisco",
  gin: "Gin",
  digestivos: "Digestivos",
  espumosos: "Vinos espumosos",
};

export function isProductVisible(product) {
  return product?.visible !== false;
}

export function getVisibleProducts(products = []) {
  return Array.isArray(products) ? products.filter(isProductVisible) : [];
}

export function formatDrinkLabel(value, fallbackFormatter = String) {
  return DRINK_LABELS[value] || fallbackFormatter(value);
}

export function getPrimaryProductImage(product, fallback = "") {
  return product?.gallery?.[0]?.image || fallback;
}

export function getOfferPrice(product) {
  const regularPrice = Number(product?.price);
  const offerPrice = Number(product?.offerPrice);

  if (
    product?.offer !== true ||
    !Number.isFinite(regularPrice) ||
    !Number.isFinite(offerPrice) ||
    regularPrice <= 0 ||
    offerPrice <= 0 ||
    offerPrice >= regularPrice
  ) {
    return null;
  }

  return offerPrice;
}

export function getEffectiveProductPrice(product) {
  return getOfferPrice(product) ?? (Number(product?.price) || 0);
}

export function getProductDiscountPercentage(product) {
  const regularPrice = Number(product?.price);
  const offerPrice = getOfferPrice(product);

  if (offerPrice === null) return 0;

  return Math.round(((regularPrice - offerPrice) / regularPrice) * 100);
}

export function findProductById(products, id) {
  return products.find((product) => {
    return String(product.id) === String(id);
  });
}
