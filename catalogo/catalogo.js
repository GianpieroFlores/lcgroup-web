import "./catalogo.css";

import { createProductCard } from "../src/components/product-card/product-card.js";

/* ==========================================
   ESTADO DEL CATÁLOGO
========================================== */

let products = [];
let filteredProducts = [];

const selectedCategories = new Set();
const selectedBrands = new Set();

let minimumPrice = null;
let maximumPrice = null;
let sortValue = "default";

/* ==========================================
   ELEMENTOS DEL DOM
========================================== */

const productGrid = document.getElementById("catalog-product-grid");

const categoryFilters = document.getElementById("category-filters");

const brandFilters = document.getElementById("brand-filters");

const brandSearch = document.getElementById("brand-search");

const minimumPriceInput = document.getElementById("minimum-price");

const maximumPriceInput = document.getElementById("maximum-price");

const applyPriceButton = document.getElementById("apply-price-filter");

const clearFiltersButton = document.getElementById("clear-filters");

const emptyClearFiltersButton = document.getElementById("empty-clear-filters");

const sortSelect = document.getElementById("catalog-sort-select");

const resultsCount = document.getElementById("catalog-results-count");

const emptyState = document.getElementById("catalog-empty-state");

const sidebar = document.getElementById("catalog-sidebar");

const filterOpenButton = document.querySelector(".catalog-filter-button");

const filterCloseButton = document.querySelector(".catalog-filter-close");

const filterBackdrop = document.querySelector(".catalog-filter-backdrop");

/* ==========================================
   UTILIDADES
========================================== */

function normalizeText(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatLabel(value) {
  return String(value)
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function countByProperty(property) {
  return products.reduce((counts, product) => {
    const value = product[property];

    if (!value) {
      return counts;
    }

    counts[value] = (counts[value] || 0) + 1;

    return counts;
  }, {});
}

/* ==========================================
   CARGAR PRODUCTOS
========================================== */

async function loadProducts() {
  const response = await fetch("/src/data/products.json");

  if (!response.ok) {
    throw new Error("No se pudieron cargar los productos.");
  }

  products = await response.json();

  generateCategoryFilters();
  generateBrandFilters();
  configurePriceLimits();

  applyFilters();
}

/* ==========================================
   GENERAR CATEGORÍAS
========================================== */

function generateCategoryFilters() {
  if (!categoryFilters) {
    return;
  }

  const categoryCounts = countByProperty("category");

  const categories = Object.keys(categoryCounts).sort((a, b) =>
    a.localeCompare(b, "es", {
      sensitivity: "base",
    }),
  );

  categoryFilters.innerHTML = categories
    .map(
      (category) => `
        <label class="filter-option">
          <input
            type="checkbox"
            name="category"
            value="${category}"
          />

          <span>
            ${formatLabel(category)}
          </span>

          <small>
            (${categoryCounts[category]})
          </small>
        </label>
      `,
    )
    .join("");
}

/* ==========================================
   GENERAR MARCAS
========================================== */

function generateBrandFilters() {
  if (!brandFilters) {
    return;
  }

  const brandCounts = countByProperty("brand");

  const brands = Object.keys(brandCounts).sort((a, b) =>
    a.localeCompare(b, "es", {
      sensitivity: "base",
    }),
  );

  brandFilters.innerHTML = brands
    .map(
      (brand) => `
        <label
          class="filter-option"
          data-brand-option
          data-brand-name="${normalizeText(brand)}"
        >
          <input
            type="checkbox"
            name="brand"
            value="${brand}"
          />

          <span>
            ${brand}
          </span>

          <small>
            (${brandCounts[brand]})
          </small>
        </label>
      `,
    )
    .join("");
}

/* ==========================================
   CONFIGURAR PRECIOS
========================================== */

function configurePriceLimits() {
  if (!minimumPriceInput || !maximumPriceInput || products.length === 0) {
    return;
  }

  const prices = products.map((product) => Number(product.price));

  const lowestPrice = Math.floor(Math.min(...prices));

  const highestPrice = Math.ceil(Math.max(...prices));

  minimumPriceInput.min = String(lowestPrice);
  minimumPriceInput.max = String(highestPrice);
  minimumPriceInput.placeholder = lowestPrice.toFixed(2);

  maximumPriceInput.min = String(lowestPrice);
  maximumPriceInput.max = String(highestPrice);
  maximumPriceInput.placeholder = highestPrice.toFixed(2);
}

/* ==========================================
   FILTRAR PRODUCTOS
========================================== */

function applyFilters() {
  filteredProducts = products.filter((product) => {
    const categoryMatches =
      selectedCategories.size === 0 || selectedCategories.has(product.category);

    const brandMatches =
      selectedBrands.size === 0 || selectedBrands.has(product.brand);

    const price = Number(product.price);

    const minimumMatches = minimumPrice === null || price >= minimumPrice;

    const maximumMatches = maximumPrice === null || price <= maximumPrice;

    return categoryMatches && brandMatches && minimumMatches && maximumMatches;
  });

  sortProducts();
  renderProducts();
}

/* ==========================================
   ORDENAR PRODUCTOS
========================================== */

function sortProducts() {
  switch (sortValue) {
    case "price-asc":
      filteredProducts.sort((a, b) => Number(a.price) - Number(b.price));
      break;

    case "price-desc":
      filteredProducts.sort((a, b) => Number(b.price) - Number(a.price));
      break;

    case "name-asc":
      filteredProducts.sort((a, b) =>
        a.name.localeCompare(b.name, "es", {
          sensitivity: "base",
        }),
      );
      break;

    case "name-desc":
      filteredProducts.sort((a, b) =>
        b.name.localeCompare(a.name, "es", {
          sensitivity: "base",
        }),
      );
      break;

    case "newest":
      filteredProducts.sort((a, b) => {
        if (a.new !== b.new) {
          return Number(b.new) - Number(a.new);
        }

        return Number(b.id) - Number(a.id);
      });
      break;

    default:
      filteredProducts.sort((a, b) => Number(a.id) - Number(b.id));
  }
}

/* ==========================================
   MOSTRAR PRODUCTOS
========================================== */

async function renderProducts() {
  if (!productGrid || !resultsCount || !emptyState) {
    return;
  }

  resultsCount.textContent = `Mostrando ${filteredProducts.length} producto${
    filteredProducts.length === 1 ? "" : "s"
  }`;

  if (filteredProducts.length === 0) {
    productGrid.innerHTML = "";
    emptyState.hidden = false;

    return;
  }

  emptyState.hidden = true;

  const cards = await Promise.all(
    filteredProducts.map((product) => createProductCard(product)),
  );

  productGrid.innerHTML = cards.join("");
}

/* ==========================================
   EVENTOS DE CATEGORÍAS
========================================== */

categoryFilters?.addEventListener("change", (event) => {
  const checkbox = event.target.closest('input[name="category"]');

  if (!checkbox) {
    return;
  }

  if (checkbox.checked) {
    selectedCategories.add(checkbox.value);
  } else {
    selectedCategories.delete(checkbox.value);
  }

  applyFilters();
});

/* ==========================================
   EVENTOS DE MARCAS
========================================== */

brandFilters?.addEventListener("change", (event) => {
  const checkbox = event.target.closest('input[name="brand"]');

  if (!checkbox) {
    return;
  }

  if (checkbox.checked) {
    selectedBrands.add(checkbox.value);
  } else {
    selectedBrands.delete(checkbox.value);
  }

  applyFilters();
});

/* ==========================================
   BUSCAR MARCAS
========================================== */

brandSearch?.addEventListener("input", () => {
  const searchValue = normalizeText(brandSearch.value);

  brandFilters?.querySelectorAll("[data-brand-option]").forEach((option) => {
    const brandName = option.dataset.brandName || "";

    option.hidden = !brandName.includes(searchValue);
  });
});

/* ==========================================
   FILTRO DE PRECIO
========================================== */

applyPriceButton?.addEventListener("click", () => {
  const minimumValue = minimumPriceInput?.value.trim();

  const maximumValue = maximumPriceInput?.value.trim();

  minimumPrice = minimumValue === "" ? null : Number(minimumValue);

  maximumPrice = maximumValue === "" ? null : Number(maximumValue);

  if (
    minimumPrice !== null &&
    maximumPrice !== null &&
    minimumPrice > maximumPrice
  ) {
    [minimumPrice, maximumPrice] = [maximumPrice, minimumPrice];

    minimumPriceInput.value = String(minimumPrice);

    maximumPriceInput.value = String(maximumPrice);
  }

  applyFilters();
});

/* ==========================================
   ORDENAMIENTO
========================================== */

sortSelect?.addEventListener("change", () => {
  sortValue = sortSelect.value;

  applyFilters();
});

/* ==========================================
   LIMPIAR FILTROS
========================================== */

function clearFilters() {
  selectedCategories.clear();
  selectedBrands.clear();

  minimumPrice = null;
  maximumPrice = null;
  sortValue = "default";

  document
    .querySelectorAll('.catalog-sidebar input[type="checkbox"]')
    .forEach((checkbox) => {
      checkbox.checked = false;
    });

  if (minimumPriceInput) {
    minimumPriceInput.value = "";
  }

  if (maximumPriceInput) {
    maximumPriceInput.value = "";
  }

  if (brandSearch) {
    brandSearch.value = "";
  }

  if (sortSelect) {
    sortSelect.value = "default";
  }

  brandFilters?.querySelectorAll("[data-brand-option]").forEach((option) => {
    option.hidden = false;
  });

  applyFilters();
}

clearFiltersButton?.addEventListener("click", clearFilters);

emptyClearFiltersButton?.addEventListener("click", clearFilters);

/* ==========================================
   ACORDEÓN DE FILTROS
========================================== */

document.querySelectorAll(".filter-group-title").forEach((button) => {
  button.addEventListener("click", () => {
    const isExpanded = button.getAttribute("aria-expanded") === "true";

    button.setAttribute("aria-expanded", String(!isExpanded));

    const icon = button.querySelector(".material-symbols-outlined");

    if (icon) {
      icon.textContent = isExpanded ? "add" : "remove";
    }
  });
});

/* ==========================================
   FILTROS EN MÓVIL
========================================== */

function openMobileFilters() {
  sidebar?.classList.add("open");
  filterBackdrop?.classList.add("open");

  filterOpenButton?.setAttribute("aria-expanded", "true");

  document.body.style.overflow = "hidden";
}

function closeMobileFilters() {
  sidebar?.classList.remove("open");
  filterBackdrop?.classList.remove("open");

  filterOpenButton?.setAttribute("aria-expanded", "false");

  document.body.style.overflow = "";
}

filterOpenButton?.addEventListener("click", openMobileFilters);

filterCloseButton?.addEventListener("click", closeMobileFilters);

filterBackdrop?.addEventListener("click", closeMobileFilters);

/* ==========================================
   INICIALIZAR
========================================== */

async function initializeCatalog() {
  try {
    await loadProducts();
  } catch (error) {
    console.error("Error al inicializar el catálogo:", error);

    if (resultsCount) {
      resultsCount.textContent = "No se pudieron cargar los productos";
    }
  }
}

initializeCatalog();

/* ==========================================
   ABRIR DETALLE DEL PRODUCTO
========================================== */

productGrid?.addEventListener("click", (event) => {
  /*
   * Evita abrir el detalle cuando se presiona
   * directamente el botón del carrito.
   */
  if (event.target.closest(".catalog-cart-button")) {
    return;
  }

  const card = event.target.closest(".catalog-product-card");

  if (!card) {
    return;
  }

  const productId = Number(card.dataset.productId);

  if (!Number.isInteger(productId)) {
    return;
  }

  window.location.href = `/catalogo/producto/?id=${productId}`;
});


/* =====================================================
   OBTENER CATEGORÍA DESDE LA URL
===================================================== */


function getCategoryFromUrl() {
  const params = new URLSearchParams(window.location.search);


  return params.get("categoria");
}



/* =====================================================
   FILTRAR PRODUCTOS POR CATEGORÍA
===================================================== */


function filterProductsByCategory(products) {
  const selectedCategory = getCategoryFromUrl();


  if (!selectedCategory) {
    return products;
  }


  return products.filter((product) => {
    return product.category === selectedCategory;
  });
}



