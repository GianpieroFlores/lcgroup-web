import "./product-card.css";
import productCardHTML from "./product-card.html?raw";
import { escapeAttribute, escapeHTML } from "../../utils/escape.js";
import { getPrimaryProductImage } from "../../utils/products.js";
import { createProductUrl } from "../../utils/urls.js";

let template = null;

/* ==========================================
   CARGAR TEMPLATE
========================================== */

async function loadTemplate() {
  if (template) return template;

  template = productCardHTML;

  return template;
}

/* ==========================================
   CREAR TARJETA
========================================== */

export async function createProductCard(product) {
  let html = await loadTemplate();

  const primaryImage = getPrimaryProductImage(product);

  const secondaryImage =
    product.gallery?.[1]?.image || primaryImage;

  const productName = escapeHTML(product.name);

  const badges = [
    product.offer
      ? `
        <span class="catalog-product-badge catalog-product-badge--offer">
          Oferta
        </span>
      `
      : "",
    product.new
      ? `
        <span class="catalog-product-badge catalog-product-badge--new">
          Novedad
        </span>
      `
      : "",
  ]
    .filter(Boolean)
    .join("");

  const badgesMarkup = badges
    ? `<div class="catalog-product-badges">${badges}</div>`
    : "";

  html = html
    .replace("{{id}}", () => escapeAttribute(product.id))
    .replace("{{badges}}", () => badgesMarkup)
    .replace(
      "{{url}}",
      () =>
        escapeAttribute(
          createProductUrl(product.id),
        ),
    )
    .replace("{{primaryImage}}", () => escapeAttribute(primaryImage))
    .replace("{{secondaryImage}}", () => escapeAttribute(secondaryImage))
    .replaceAll("{{name}}", () => productName)
    .replace("{{brand}}", () => escapeHTML(product.brand))
    .replace("{{variant}}", () => escapeHTML(product.variant))
    .replace(
      "{{price}}",
      () => Number(product.price).toFixed(2),
    );

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

    if (
      event.target.closest(
        "button, input, a, select, textarea",
      )
    ) {
      return;
    }


    const card = event.target.closest(".catalog-product-card");


    if (!card) {
      return;
    }


    window.location.href = card.dataset.productUrl;
  });
}



