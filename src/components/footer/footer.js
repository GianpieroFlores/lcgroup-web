import "./footer.css";
import footerHTML from "./footer.html?raw";
import allProducts from "../../data/products.json";
import { escapeAttribute, escapeHTML } from "../../utils/escape.js";
import { getVisibleProducts } from "../../utils/products.js";
import { createCatalogUrl } from "../../utils/urls.js";

const products = getVisibleProducts(allProducts);
const FOOTER_CATEGORY_ORDER = ["copas", "vasos", "decantadores", "estuches"];

function formatFooterCategory(category) {
  return String(category)
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getFooterCategories(products) {
  const categories = new Set();

  products.forEach((product) => {
    if (
      typeof product.category === "string" &&
      product.category.trim() !== ""
    ) {
      categories.add(product.category.trim());
    }
  });

  return [...categories].sort((a, b) => {
    const positionA = FOOTER_CATEGORY_ORDER.indexOf(a);
    const positionB = FOOTER_CATEGORY_ORDER.indexOf(b);

    return positionA - positionB;
  });
}

function renderFooterCategories(products) {
  const categoryList = document.getElementById(
    "footer-category-list",
  );

  if (!categoryList) {
    return;
  }

  const categories = getFooterCategories(products);

  const categoryItems = categories
    .map((category) => {
      const categoryUrl = createCatalogUrl({
        categoria: category,
      });

      return `
        <li>
          <a
            href="${escapeAttribute(
            categoryUrl,
          )}"
            data-analytics-event="category_click"
            data-analytics-value="${escapeAttribute(category)}"
          >
            ${escapeHTML(formatFooterCategory(category))}
          </a>
        </li>
      `;
    })
    .join("");

  categoryList.innerHTML = `
    <li>
      <a href="/colecciones/">
        Colecciones
      </a>
    </li>
    ${categoryItems}
  `;
}

function loadFooterCategories() {
  renderFooterCategories(products);
}

export async function loadFooter() {
  const footerContainer = document.getElementById(
    "footer-container",
  );

  if (!footerContainer) {
    return;
  }

  try {
    footerContainer.innerHTML = footerHTML;

    loadFooterCategories();
  } catch (error) {
    console.error(
      "Error al cargar el footer:",
      error,
    );
  }
}
