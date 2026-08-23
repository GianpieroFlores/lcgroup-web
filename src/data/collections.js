export const COLLECTIONS = [
  "APERO",
  "AUTHENTIS",
  "AUTHENTIS CASUAL",
  "BBQ & DRINKS",
  "BECHER",
  "BEER CLASSIC",
  "BEER TULIP",
  "CASUAL",
  "CLASSIC BAR",
  "COCKTAIL",
  "CRAFT BEER",
  "DECANTER",
  "DEFINITION",
  "DIFINITION",
  "ELEGANCE",
  "FESTINO",
  "FESTIVAL",
  "GIFT SETS",
  "LINEAR",
  "PERFECT SERVE",
  "RED & WHITE",
  "SALUTE",
  "SOIRE",
  "SPECIAL GLASSES",
  "STYLE",
  "VINO GRANDE",
  "WINELOVERS",
];

const normalizeCollection = (value) => String(value || "").trim().toUpperCase();

export function getAvailableCollections(products) {
  const productCollections = new Map();

  products.forEach((product) => {
    const collection = String(product.collection || "").trim();

    if (collection) {
      productCollections.set(normalizeCollection(collection), collection);
    }
  });

  return COLLECTIONS.map((collection) =>
    productCollections.get(normalizeCollection(collection)),
  ).filter(Boolean);
}
