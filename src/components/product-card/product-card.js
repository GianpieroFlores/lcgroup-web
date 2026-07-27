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
  .replace(
  "{{url}}",
  `/catalogo/producto/?id=${product.id}`,
)
  .replace("{{image}}", product.image)
  .replaceAll("{{name}}", product.name)
  .replace("{{brand}}", product.brand)
  .replace("{{variant}}", product.variant)
  .replace("{{price}}", Number(product.price).toFixed(2));

  return html;
}

/* ==========================================
   NAVEGACIÓN PRODUCT CARD
========================================== */


export function initProductCardNavigation(container = document) {
  container.addEventListener("click", (event) => {
    const card = event.target.closest(".catalog-product-card");


    if (!card) {
      return;
    }


    /* No navegar si se hizo click en un control */


    if (
      event.target.closest(
        "button, input, a, select, textarea",
      )
    ) {
      return;
    }


    window.location.href = card.dataset.productUrl;
  });


  container.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }


    const card = event.target.closest(".catalog-product-card");


    if (!card) {
      return;
    }


    window.location.href = card.dataset.productUrl;
  });
}



