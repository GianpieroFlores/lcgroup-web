import "./footer.css";
import footerHTML from "./footer.html?raw";
import products from "../../data/products.json";
import { escapeAttribute, escapeHTML } from "../../utils/escape.js";
import { createCatalogUrl } from "../../utils/urls.js";

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

  return [...categories].sort((a, b) =>
    a.localeCompare(b, "es", {
      sensitivity: "base",
    }),
  );
}

function renderFooterCategories(products) {
  const categoryList = document.getElementById(
    "footer-category-list",
  );

  if (!categoryList) {
    return;
  }

  const categories = getFooterCategories(products);

  categoryList.innerHTML = categories
    .map((category) => {
      const categoryUrl = createCatalogUrl({
        categoria: category,
      });

      return `
        <li>
          <a href="${escapeAttribute(
            categoryUrl,
          )}">
            ${escapeHTML(formatFooterCategory(category))}
          </a>
        </li>
      `;
    })
    .join("");
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
