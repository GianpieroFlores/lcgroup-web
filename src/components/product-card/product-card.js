import "./product-card.css";

let template = null;

/* ==========================================
   CARGAR TEMPLATE
========================================== */

async function loadTemplate() {
  if (template) return template;

  const response = await fetch(
    "/src/components/product-card/product-card.html",
  );

  if (!response.ok) {
    throw new Error("No se pudo cargar product-card.html");
  }

  template = await response.text();

  return template;
}

/* ==========================================
   CREAR TARJETA
========================================== */

export async function createProductCard(product) {
  let html = await loadTemplate();

  html = html
    .replace("{{id}}", product.id)
    .replace("{{image}}", product.image)
    .replaceAll("{{name}}", product.name)
    .replace("{{brand}}", product.brand)
    .replace("{{variant}}", product.variant)
    .replace("{{price}}", Number(product.price).toFixed(2));

  return html;
}
