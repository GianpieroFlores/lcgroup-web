import "./product-card.css";
import productCardHTML from "./product-card.html?raw";
import { escapeAttribute, escapeHTML } from "../../utils/escape.js";
import {
  getPrimaryProductImage,
  getOfferPrice,
  getProductDiscountPercentage,
  getVisibleProducts,
  isProductVisible,
} from "../../utils/products.js";
import { createProductUrl } from "../../utils/urls.js";
import allProducts from "../../data/products.json";
import { findProductById } from "../../utils/products.js";
import { trackSelectItem } from "../../services/analytics.js";

let template = null;
const products = getVisibleProducts(allProducts);

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
  if (!isProductVisible(product)) return "";

  let html = await loadTemplate();

  const primaryImage = getPrimaryProductImage(product);

  const secondaryImage =
    product.gallery?.[1]?.image || primaryImage;

  const productName = escapeHTML(product.name);
  const offerPrice = getOfferPrice(product);
  const discountPercentage = getProductDiscountPercentage(product);
  const priceMarkup = offerPrice === null
    ? `<strong class="catalog-product-price">S/ ${Number(product.price).toFixed(2)}</strong>`
    : `<span class="catalog-product-price catalog-product-price--regular">S/ ${Number(product.price).toFixed(2)}</span>
       <span class="catalog-product-offer-row">
         <strong class="catalog-product-price catalog-product-price--offer">S/ ${offerPrice.toFixed(2)}</strong>
         <span class="catalog-product-discount">-${discountPercentage}%</span>
       </span>`;

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
    .replaceAll(
      "{{url}}",
      () =>
        escapeAttribute(
          createProductUrl(product),
        ),
    )
    .replace("{{primaryImage}}", () => escapeAttribute(primaryImage))
    .replace("{{secondaryImage}}", () => escapeAttribute(secondaryImage))
    .replaceAll("{{name}}", () => productName)
    .replace("{{collection}}", () => escapeHTML(product.collection))
    .replace("{{presentation}}", () => escapeHTML(product.presentation))
    .replace("{{priceMarkup}}", () => priceMarkup);

  return html;
}

/* ==========================================
   NAVEGACIÓN PRODUCT CARD
========================================== */


export function initProductCardNavigation(container = document) {
  function trackCardSelection(card) {
    const product = findProductById(products, card.dataset.productId);
    if (!product) return;
    trackSelectItem(product, {
      listId: card.dataset.analyticsListId,
      listName: card.dataset.analyticsListName,
      index: card.dataset.analyticsIndex,
      searchTerm: card.dataset.analyticsSearchTerm,
    });
  }

  container.addEventListener("click", (event) => {
    const card = event.target.closest(".catalog-product-card");


    if (!card) {
      return;
    }


    /* No navegar si se hizo click en un control */


    const productLink = event.target.closest(".catalog-product-name a");
    if (productLink) {
      trackCardSelection(card);
      return;
    }

    if (
      event.target.closest(
        "button, input, a, select, textarea",
      )
    ) {
      return;
    }


    trackCardSelection(card);
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


    trackCardSelection(card);
    window.location.href = card.dataset.productUrl;
  });
}



