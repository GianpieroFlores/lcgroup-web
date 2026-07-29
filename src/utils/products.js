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

export function formatDrinkLabel(value, fallbackFormatter = String) {
  return DRINK_LABELS[value] || fallbackFormatter(value);
}

export function getPrimaryProductImage(product, fallback = "") {
  return product?.gallery?.[0]?.image || fallback;
}

export function findProductById(products, id) {
  return products.find((product) => {
    return String(product.id) === String(id);
  });
}
