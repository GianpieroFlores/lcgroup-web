import "./catalogo.css";
import productsData from "../src/data/products.json";

import { createProductCard } from "../src/components/product-card/product-card.js";
import { escapeAttribute, escapeHTML } from "../src/utils/escape.js";
import { formatDrinkLabel } from "../src/utils/products.js";
import {
  getProductSearchText,
  normalizeSearchText,
} from "../src/utils/search.js";

/* ==========================================
   ESTADO DEL CATÁLOGO
========================================== */

let products = [];
let filteredProducts = [];

const selectedCategories = new Set();
const selectedBrands = new Set();
const selectedDrinks = new Set();
const selectedSelections = new Set();

let minimumPrice = null;
let maximumPrice = null;
let sortValue = "default";
let searchQuery = "";
let currentPage = 1;
let catalogMinimumPrice = 0;
let catalogMaximumPrice = 0;
let priceFilterFrame = null;
let availableBrandSuggestions = [];
let activeBrandSuggestionIndex = -1;

const PRODUCTS_PER_PAGE = 18;

/* ==========================================
   ELEMENTOS DEL DOM
========================================== */

const productGrid = document.getElementById("catalog-product-grid");

const selectionFilters = document.getElementById("selection-filters");

const categoryFilters = document.getElementById("category-filters");

const brandFilters = document.getElementById("brand-filters");

const drinkFilters = document.getElementById("drink-filters");

const brandSearch = document.getElementById("brand-search");

const brandSearchContainer = document.getElementById(
  "brand-search-container",
);

const brandSearchResults = document.getElementById(
  "brand-search-results",
);

const minimumPriceInput = document.getElementById("minimum-price");

const maximumPriceInput = document.getElementById("maximum-price");

const minimumPriceValue = document.getElementById("minimum-price-value");

const maximumPriceValue = document.getElementById("maximum-price-value");

const priceRangeControl = document.getElementById("price-range-control");
const clearFiltersButton = document.getElementById("clear-filters");

const emptyClearFiltersButton = document.getElementById("empty-clear-filters");

const sortSelect = document.getElementById("catalog-sort-select");

const resultsCount = document.getElementById("catalog-results-count");

const emptyState = document.getElementById("catalog-empty-state");

const pagination = document.getElementById("catalog-pagination");

const sidebar = document.getElementById("catalog-sidebar");

const filterOpenButton = document.querySelector(".catalog-filter-button");

const filterCloseButton = document.querySelector(".catalog-filter-close");

const filterBackdrop = document.querySelector(".catalog-filter-backdrop");

let mobileFilterTriggerElement = null;

const FILTER_FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/* ==========================================
   UTILIDADES
========================================== */

function formatLabel(value) {
  return String(value)
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function productMatchesActiveFilters(product, ignoredFacet = "") {
  const selectionMatches =
    ignoredFacet === "selection" ||
    selectedSelections.size === 0 ||
    [...selectedSelections].some((selection) => {
      if (selection === "ofertas") {
        return product.offer === true;
      }

      if (selection === "novedades") {
        return product.new === true;
      }

      return false;
    });

  const categoryMatches =
    ignoredFacet === "category" ||
    selectedCategories.size === 0 ||
    selectedCategories.has(product.category);

  const brandMatches =
    ignoredFacet === "brand" ||
    selectedBrands.size === 0 ||
    selectedBrands.has(product.brand);

  const productDrinks = Array.isArray(product.recommendedFor)
    ? product.recommendedFor
    : [];

  const drinkMatches =
    ignoredFacet === "drink" ||
    selectedDrinks.size === 0 ||
    [...selectedDrinks].some((drink) => productDrinks.includes(drink));

  const price = Number(product.price);

  const minimumMatches = minimumPrice === null || price >= minimumPrice;
  const maximumMatches = maximumPrice === null || price <= maximumPrice;

  const searchWords = searchQuery.split(/\s+/).filter(Boolean);
  const productSearchText = getProductSearchText(product);

  const searchMatches =
    searchWords.length === 0 ||
    searchWords.every((word) => productSearchText.includes(word));

  return (
    selectionMatches &&
    categoryMatches &&
    brandMatches &&
    drinkMatches &&
    minimumMatches &&
    maximumMatches &&
    searchMatches
  );
}

function countSelections() {
  return products.reduce(
    (counts, product) => {
      if (!productMatchesActiveFilters(product, "selection")) {
        return counts;
      }

      if (product.offer === true) {
        counts.ofertas += 1;
      }

      if (product.new === true) {
        counts.novedades += 1;
      }

      return counts;
    },
    {
      ofertas: 0,
      novedades: 0,
    },
  );
}

function countByProperty(property, ignoredFacet) {
  return products.reduce((counts, product) => {
    if (!productMatchesActiveFilters(product, ignoredFacet)) {
      return counts;
    }

    const value = product[property];

    if (!value) {
      return counts;
    }

    counts[value] = (counts[value] || 0) + 1;

    return counts;
  }, {});
}

function countRecommendedDrinks() {
  return products.reduce((counts, product) => {
    if (!productMatchesActiveFilters(product, "drink")) {
      return counts;
    }

    if (!Array.isArray(product.recommendedFor)) {
      return counts;
    }

    product.recommendedFor.forEach((drink) => {
      const drinkValue = String(drink).trim();

      if (!drinkValue) {
        return;
      }

      counts[drinkValue] = (counts[drinkValue] || 0) + 1;
    });

    return counts;
  }, {});
}
/* ==========================================
   CARGAR CATEGORÍAS DESDE LA URL
========================================== */

function loadSetFromUrl(
  params,
  parameterName,
  selectedValues,
  availableValues,
) {
  const parameterValue = params.get(parameterName);

  selectedValues.clear();

  if (!parameterValue) {
    return;
  }

  parameterValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => {
      if (availableValues.has(value)) {
        selectedValues.add(value);
      }
    });
}

/* ==========================================
   CARGAR BUSQUEDA DESDE LA URL
========================================== */

function loadSearchFromUrl(params) {
  searchQuery = normalizeSearchText(params.get("search") || "");
}

function loadPageFromUrl(params) {
  const requestedPage = Number.parseInt(params.get("pagina"), 10);

  currentPage =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
}

/* ==========================================
   SINCRONIZAR CHECKBOX DE CATEGORÍAS
========================================== */

function syncCheckboxes(container, inputName, selectedValues) {
  container
    ?.querySelectorAll(`input[name="${inputName}"]`)
    .forEach((checkbox) => {
      checkbox.checked = selectedValues.has(checkbox.value);
    });
}

/* ==========================================
   ACTUALIZAR CATEGORÍAS EN LA URL
========================================== */

function updateSetParameter(parameterName, selectedValues) {
  const url = new URL(window.location.href);

  if (selectedValues.size === 0) {
    url.searchParams.delete(parameterName);
  } else {
    url.searchParams.set(parameterName, [...selectedValues].join(","));
  }

  window.history.replaceState({}, "", `${url.pathname}${url.search}`);
}

/* ==========================================
   CARGAR PRODUCTOS
========================================== */

async function loadProducts() {
  products = productsData;

  configurePriceLimits();

  const params = new URLSearchParams(window.location.search);

  loadSetFromUrl(
    params,
    "seleccion",
    selectedSelections,
    new Set(["ofertas", "novedades"]),
  );

  loadSetFromUrl(
    params,
    "categoria",
    selectedCategories,
    new Set(products.map((product) => product.category)),
  );

  loadSetFromUrl(
    params,
    "marca",
    selectedBrands,
    new Set(products.map((product) => product.brand)),
  );

  loadSetFromUrl(
    params,
    "bebida",
    selectedDrinks,
    new Set(
      products.flatMap((product) => {
        return Array.isArray(product.recommendedFor)
          ? product.recommendedFor
          : [];
      }),
    ),
  );

  loadSearchFromUrl(params);
  loadPageFromUrl(params);

  applyFilters({ resetPage: false });
}

/* ==========================================
   GENERAR SELECCIONES
========================================== */

function generateSelectionFilters() {
  if (!selectionFilters) {
    return;
  }

  const selectionCounts = countSelections();

  const selections = [
    {
      value: "ofertas",
      label: "Ofertas",
    },
    {
      value: "novedades",
      label: "Novedades",
    },
  ].filter((selection) => {
    return (
      selectionCounts[selection.value] > 0 ||
      selectedSelections.has(selection.value)
    );
  });

  selectionFilters.innerHTML = selections
    .map((selection) => {
      return `
        <label class="filter-option">
          <input
            type="checkbox"
            name="selection"
            value="${selection.value}"
          />

          <span>${selection.label}</span>

          <small>
            (${selectionCounts[selection.value] || 0})
          </small>
        </label>
      `;
    })
    .join("");
}

/* ==========================================
   GENERAR CATEGORÍAS
========================================== */

function generateCategoryFilters() {
  if (!categoryFilters) {
    return;
  }

  const categoryCounts = countByProperty("category", "category");

  const categories = [
    ...new Set([
      ...Object.keys(categoryCounts),
      ...selectedCategories,
    ]),
  ].sort((a, b) =>
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
            value="${escapeAttribute(category)}"
          />

          <span>
            ${escapeHTML(formatLabel(category))}
          </span>

          <small>
            (${categoryCounts[category] || 0})
          </small>
        </label>
      `,
    )
    .join("");
}

/* ==========================================
   GENERAR FILTROS DE BEBIDAS
========================================== */

function generateDrinkFilters() {
  if (!drinkFilters) {
    return;
  }

  const drinkCounts = countRecommendedDrinks();

  const drinks = [
    ...new Set([
      ...Object.keys(drinkCounts),
      ...selectedDrinks,
    ]),
  ].sort((a, b) => {
    return formatDrinkLabel(a, formatLabel).localeCompare(
      formatDrinkLabel(b, formatLabel),
      "es",
      {
        sensitivity: "base",
      },
    );
  });

  drinkFilters.innerHTML = drinks
    .map(
      (drink) => `
        <label class="filter-option">
          <input
            type="checkbox"
            name="drink"
            value="${escapeAttribute(drink)}"
          />

          <span>
            ${escapeHTML(formatDrinkLabel(drink, formatLabel))}
          </span>

          <small>
            (${drinkCounts[drink] || 0})
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

  const brandCounts = countByProperty("brand", "brand");

  const brands = [
    ...new Set([
      ...Object.keys(brandCounts),
      ...selectedBrands,
    ]),
  ].sort((a, b) =>
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
          data-brand-name="${escapeAttribute(normalizeSearchText(brand))}"
        >
          <input
            type="checkbox"
            name="brand"
            value="${escapeAttribute(brand)}"
          />

          <span>
            ${escapeHTML(brand)}
          </span>

          <small>
            (${brandCounts[brand] || 0})
          </small>
        </label>
      `,
    )
    .join("");

  availableBrandSuggestions = brands;
}

/* ==========================================
   CONFIGURAR PRECIOS
========================================== */

function configurePriceLimits() {
  if (!minimumPriceInput || !maximumPriceInput || products.length === 0) {
    return;
  }

  const prices = products.map((product) => Number(product.price));

  catalogMinimumPrice = Math.min(...prices);
  catalogMaximumPrice = Math.max(...prices);

  minimumPriceInput.min = String(catalogMinimumPrice);
  minimumPriceInput.max = String(catalogMaximumPrice);
  minimumPriceInput.value = String(catalogMinimumPrice);

  maximumPriceInput.min = String(catalogMinimumPrice);
  maximumPriceInput.max = String(catalogMaximumPrice);
  maximumPriceInput.value = String(catalogMaximumPrice);

  updatePriceRangePresentation();
}

function formatPrice(value) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function updatePriceRangePresentation() {
  if (
    !minimumPriceInput ||
    !maximumPriceInput ||
    catalogMaximumPrice <= catalogMinimumPrice
  ) {
    return;
  }

  const selectedMinimum = Number(minimumPriceInput.value);
  const selectedMaximum = Number(maximumPriceInput.value);
  const priceDifference = catalogMaximumPrice - catalogMinimumPrice;

  const minimumPosition =
    ((selectedMinimum - catalogMinimumPrice) / priceDifference) * 100;
  const maximumPosition =
    ((selectedMaximum - catalogMinimumPrice) / priceDifference) * 100;

  priceRangeControl?.style.setProperty(
    "--range-start",
    `${minimumPosition}%`,
  );
  priceRangeControl?.style.setProperty(
    "--range-end",
    `${maximumPosition}%`,
  );

  if (minimumPriceValue) {
    minimumPriceValue.textContent = formatPrice(selectedMinimum);
  }

  if (maximumPriceValue) {
    maximumPriceValue.textContent = formatPrice(selectedMaximum);
  }
}

function schedulePriceFiltering() {
  window.cancelAnimationFrame(priceFilterFrame);

  priceFilterFrame = window.requestAnimationFrame(() => {
    minimumPrice =
      Number(minimumPriceInput?.value) <= catalogMinimumPrice
        ? null
        : Number(minimumPriceInput?.value);

    maximumPrice =
      Number(maximumPriceInput?.value) >= catalogMaximumPrice
        ? null
        : Number(maximumPriceInput?.value);

    applyFilters();
  });
}

function handlePriceRangeInput(event) {
  if (!minimumPriceInput || !maximumPriceInput) {
    return;
  }

  if (
    event.target === minimumPriceInput &&
    Number(minimumPriceInput.value) > Number(maximumPriceInput.value)
  ) {
    minimumPriceInput.value = maximumPriceInput.value;
  }

  if (
    event.target === maximumPriceInput &&
    Number(maximumPriceInput.value) < Number(minimumPriceInput.value)
  ) {
    maximumPriceInput.value = minimumPriceInput.value;
  }

  updatePriceRangePresentation();
  schedulePriceFiltering();
}

/* ==========================================
   FILTRAR PRODUCTOS
========================================== */

function applyFilters({ resetPage = true } = {}) {
  if (resetPage) {
    currentPage = 1;
  }

  filteredProducts = products.filter((product) => {
    return productMatchesActiveFilters(product);
  });

  sortProducts();
  updateAvailableFilters();

  currentPage = Math.min(currentPage, getTotalPages());
  updatePageParameter();
  renderProducts();
}

function applyBrandSearch() {
  const searchValue = normalizeSearchText(brandSearch?.value || "");

  brandFilters?.querySelectorAll("[data-brand-option]").forEach((option) => {
    const brandName = option.dataset.brandName || "";

    option.hidden = !brandName.includes(searchValue);
  });

  renderBrandSearchResults(searchValue);
}

function closeBrandSearchResults() {
  if (!brandSearch || !brandSearchResults) {
    return;
  }

  brandSearchResults.hidden = true;
  brandSearchResults.replaceChildren();
  brandSearch.setAttribute("aria-expanded", "false");
  brandSearch.removeAttribute("aria-activedescendant");
  activeBrandSuggestionIndex = -1;
}

function getBrandResultElements() {
  return [
    ...(brandSearchResults?.querySelectorAll("[data-brand-suggestion]") || []),
  ];
}

function updateActiveBrandSuggestion() {
  const resultElements = getBrandResultElements();

  resultElements.forEach((result, index) => {
    const isActive = index === activeBrandSuggestionIndex;

    result.classList.toggle("is-active", isActive);
    result.setAttribute("aria-selected", String(isActive));
  });

  const activeResult = resultElements[activeBrandSuggestionIndex];

  if (activeResult) {
    brandSearch?.setAttribute("aria-activedescendant", activeResult.id);
    activeResult.scrollIntoView({ block: "nearest" });
  } else {
    brandSearch?.removeAttribute("aria-activedescendant");
  }
}

function renderBrandSearchResults(searchValue) {
  if (!brandSearch || !brandSearchResults) {
    return;
  }

  activeBrandSuggestionIndex = -1;

  if (!searchValue) {
    closeBrandSearchResults();
    return;
  }

  const matchingBrands = availableBrandSuggestions.filter((brand) => {
    return normalizeSearchText(brand).includes(searchValue);
  });

  if (matchingBrands.length === 0) {
    brandSearchResults.innerHTML = `
      <p class="filter-brand-search__empty">
        No encontramos marcas con “${escapeHTML(brandSearch.value.trim())}”.
      </p>
    `;
  } else {
    brandSearchResults.innerHTML = matchingBrands
      .map((brand, index) => {
        return `
          <button
            id="brand-suggestion-${index}"
            class="filter-brand-search__result"
            type="button"
            role="option"
            aria-selected="false"
            data-brand-suggestion="${escapeAttribute(brand)}"
          >
            <span>${escapeHTML(brand)}</span>
          </button>
        `;
      })
      .join("");
  }

  brandSearchResults.hidden = false;
  brandSearch.setAttribute("aria-expanded", "true");
}

function selectBrandSuggestions(brands) {
  const validBrands = brands.filter(Boolean);

  if (validBrands.length === 0) {
    return;
  }

  validBrands.forEach((brand) => {
    selectedBrands.add(brand);
  });

  updateSetParameter("marca", selectedBrands);

  if (brandSearch) {
    brandSearch.value = "";
  }

  closeBrandSearchResults();
  applyFilters();
}

function selectBrandSuggestion(brand) {
  selectBrandSuggestions([brand]);
}

function updateAvailableFilters() {
  generateSelectionFilters();
  generateCategoryFilters();
  generateBrandFilters();
  generateDrinkFilters();

  syncCheckboxes(selectionFilters, "selection", selectedSelections);
  syncCheckboxes(categoryFilters, "category", selectedCategories);
  syncCheckboxes(brandFilters, "brand", selectedBrands);
  syncCheckboxes(drinkFilters, "drink", selectedDrinks);

  applyBrandSearch();
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

  if (filteredProducts.length === 0) {
    resultsCount.textContent = "Mostrando 0 productos";
    productGrid.innerHTML = "";
    emptyState.hidden = false;
    renderPagination();

    return;
  }

  emptyState.hidden = true;

  const firstProductIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const lastProductIndex = Math.min(
    firstProductIndex + PRODUCTS_PER_PAGE,
    filteredProducts.length,
  );

  const visibleProducts = filteredProducts.slice(
    firstProductIndex,
    lastProductIndex,
  );

  resultsCount.textContent =
    `Mostrando ${firstProductIndex + 1}–${lastProductIndex} ` +
    `de ${filteredProducts.length} productos`;

  const cards = await Promise.all(
    visibleProducts.map((product) => createProductCard(product)),
  );

  productGrid.innerHTML = cards.join("");
  renderPagination();
}

/* ==========================================
   PAGINACIÓN
========================================== */

function getTotalPages() {
  return Math.max(
    1,
    Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE),
  );
}

function updatePageParameter() {
  const url = new URL(window.location.href);

  if (currentPage <= 1) {
    url.searchParams.delete("pagina");
  } else {
    url.searchParams.set("pagina", String(currentPage));
  }

  window.history.replaceState({}, "", `${url.pathname}${url.search}`);
}

function getVisiblePageNumbers(totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  let pages;

  if (currentPage <= 3) {
    pages = [1, 2, 3, totalPages];
  } else if (currentPage >= totalPages - 2) {
    pages = [1, totalPages - 2, totalPages - 1, totalPages];
  } else {
    pages = [
      1,
      currentPage - 1,
      currentPage,
      currentPage + 1,
      totalPages,
    ];
  }

  return [...new Set(pages)]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

function renderPagination() {
  if (!pagination) {
    return;
  }

  const totalPages = getTotalPages();

  if (filteredProducts.length === 0 || totalPages <= 1) {
    pagination.replaceChildren();
    pagination.hidden = true;
    return;
  }

  pagination.hidden = false;

  const pageNumbers = getVisiblePageNumbers(totalPages);

  const numberButtons = pageNumbers
    .map((page, index) => {
      const previousPage = pageNumbers[index - 1];
      const separator =
        previousPage && page - previousPage > 1
          ? '<span class="catalog-pagination__ellipsis" aria-hidden="true">…</span>'
          : "";

      return `
        ${separator}
        <button
          class="catalog-pagination__page${page === currentPage ? " is-active" : ""}"
          type="button"
          data-page="${page}"
          aria-label="Ir a la página ${page}"
          ${page === currentPage ? 'aria-current="page"' : ""}
        >
          ${page}
        </button>
      `;
    })
    .join("");

  pagination.innerHTML = `
    <div class="catalog-pagination__navigation">
      <button
        class="catalog-pagination__arrow"
        type="button"
        data-page="${currentPage - 1}"
        aria-label="Página anterior"
        ${currentPage === 1 ? "disabled" : ""}
      >
        <span class="material-symbols-outlined" aria-hidden="true">
          arrow_back
        </span>
      </button>

      <div class="catalog-pagination__pages">
        ${numberButtons}
      </div>

      <button
        class="catalog-pagination__arrow"
        type="button"
        data-page="${currentPage + 1}"
        aria-label="Página siguiente"
        ${currentPage === totalPages ? "disabled" : ""}
      >
        <span class="material-symbols-outlined" aria-hidden="true">
          arrow_forward
        </span>
      </button>
    </div>

    <form class="catalog-pagination__jump" data-page-form>
      <label for="catalog-page-input">Página</label>

      <input
        id="catalog-page-input"
        name="pagina"
        type="number"
        min="1"
        max="${totalPages}"
        value="${currentPage}"
        inputmode="numeric"
        aria-label="Número de página"
      />

      <span>de ${totalPages}</span>

      <button type="submit">Ir</button>
    </form>
  `;
}

function goToPage(page, { scroll = true } = {}) {
  const requestedPage = Number.parseInt(page, 10);
  const totalPages = getTotalPages();

  if (!Number.isInteger(requestedPage)) {
    renderPagination();
    return;
  }

  const nextPage = Math.min(Math.max(requestedPage, 1), totalPages);

  if (nextPage === currentPage) {
    renderPagination();
    return;
  }

  currentPage = nextPage;
  updatePageParameter();
  renderProducts();

  if (scroll) {
    productGrid?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }
}

pagination?.addEventListener("click", (event) => {
  const pageButton = event.target.closest("[data-page]");

  if (!pageButton || pageButton.disabled) {
    return;
  }

  goToPage(pageButton.dataset.page);
});

pagination?.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-page-form]");

  if (!form) {
    return;
  }

  event.preventDefault();

  const pageInput = form.elements.namedItem("pagina");

  goToPage(pageInput?.value);
});

/* ==========================================
   EVENTOS DE CATEGORÍAS
========================================== */

function setupSetFilter(
  container,
  inputName,
  parameterName,
  selectedValues,
) {
  container?.addEventListener("change", (event) => {
    const checkbox = event.target.closest(`input[name="${inputName}"]`);

    if (!checkbox) {
      return;
    }

    if (checkbox.checked) {
      selectedValues.add(checkbox.value);
    } else {
      selectedValues.delete(checkbox.value);
    }

    updateSetParameter(parameterName, selectedValues);
    applyFilters();
  });
}

setupSetFilter(
  selectionFilters,
  "selection",
  "seleccion",
  selectedSelections,
);

setupSetFilter(
  categoryFilters,
  "category",
  "categoria",
  selectedCategories,
);

setupSetFilter(
  brandFilters,
  "brand",
  "marca",
  selectedBrands,
);

setupSetFilter(
  drinkFilters,
  "drink",
  "bebida",
  selectedDrinks,
);

/* ==========================================
   BUSCAR MARCAS
========================================== */

brandSearch?.addEventListener("input", () => {
  applyBrandSearch();
});

brandSearch?.addEventListener("focus", () => {
  applyBrandSearch();
});

brandSearch?.addEventListener("keydown", (event) => {
  const resultElements = getBrandResultElements();

  if (event.key === "Escape") {
    closeBrandSearchResults();
    return;
  }

  if (resultElements.length === 0) {
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();

    activeBrandSuggestionIndex =
      activeBrandSuggestionIndex < resultElements.length - 1
        ? activeBrandSuggestionIndex + 1
        : 0;

    updateActiveBrandSuggestion();
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();

    activeBrandSuggestionIndex =
      activeBrandSuggestionIndex > 0
        ? activeBrandSuggestionIndex - 1
        : resultElements.length - 1;

    updateActiveBrandSuggestion();
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();

    if (activeBrandSuggestionIndex >= 0) {
      selectBrandSuggestion(
        resultElements[activeBrandSuggestionIndex]?.dataset.brandSuggestion,
      );
      return;
    }

    selectBrandSuggestions(
      resultElements.map((result) => result.dataset.brandSuggestion),
    );
  }
});

brandSearchResults?.addEventListener("click", (event) => {
  const result = event.target.closest("[data-brand-suggestion]");

  if (!result) {
    return;
  }

  selectBrandSuggestion(result.dataset.brandSuggestion);
});

document.addEventListener("click", (event) => {
  if (!brandSearchContainer?.contains(event.target)) {
    closeBrandSearchResults();
  }
});

/* ==========================================
   FILTRO DE PRECIO
========================================== */

minimumPriceInput?.addEventListener("input", handlePriceRangeInput);

maximumPriceInput?.addEventListener("input", handlePriceRangeInput);

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
  selectedSelections.clear();
  selectedCategories.clear();
  selectedBrands.clear();
  selectedDrinks.clear();

  minimumPrice = null;
  maximumPrice = null;
  sortValue = "default";
  searchQuery = "";

  document
    .querySelectorAll('.catalog-sidebar input[type="checkbox"]')
    .forEach((checkbox) => {
      checkbox.checked = false;
    });

  if (minimumPriceInput) {
    minimumPriceInput.value = String(catalogMinimumPrice);
  }

  if (maximumPriceInput) {
    maximumPriceInput.value = String(catalogMaximumPrice);
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

  updatePriceRangePresentation();
  updateSetParameter("seleccion", selectedSelections);
  updateSetParameter("categoria", selectedCategories);
  updateSetParameter("marca", selectedBrands);
  updateSetParameter("bebida", selectedDrinks);

  const url = new URL(window.location.href);
  url.searchParams.delete("search");
  window.history.replaceState({}, "", `${url.pathname}${url.search}`);

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
  const activeElement = document.activeElement;

  if (activeElement instanceof HTMLElement) {
    mobileFilterTriggerElement = activeElement;
  }

  sidebar?.classList.add("open");
  filterBackdrop?.classList.add("open");

  sidebar?.setAttribute("role", "dialog");
  sidebar?.setAttribute("aria-modal", "true");
  sidebar?.setAttribute("aria-hidden", "false");

  filterBackdrop?.setAttribute("aria-hidden", "false");
  filterOpenButton?.setAttribute("aria-expanded", "true");

  document.body.style.overflow = "hidden";

  window.requestAnimationFrame(() => {
    filterCloseButton?.focus();
  });
}

function closeMobileFilters() {
  const filtersWereOpen = sidebar?.classList.contains("open");

  sidebar?.classList.remove("open");
  filterBackdrop?.classList.remove("open");

  sidebar?.setAttribute("aria-hidden", "true");
  sidebar?.removeAttribute("aria-modal");

  filterBackdrop?.setAttribute("aria-hidden", "true");
  filterOpenButton?.setAttribute("aria-expanded", "false");

  document.body.style.overflow = "";

  if (filtersWereOpen && mobileFilterTriggerElement?.isConnected) {
    const elementToFocus = mobileFilterTriggerElement;

    mobileFilterTriggerElement = null;

    window.requestAnimationFrame(() => {
      elementToFocus.focus();
    });
  }
}

function getMobileFilterFocusableElements() {
  if (!sidebar) {
    return [];
  }

  return Array.from(
    sidebar.querySelectorAll(FILTER_FOCUSABLE_SELECTOR),
  ).filter((element) => {
    return (
      element instanceof HTMLElement &&
      !element.hidden &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.getClientRects().length > 0
    );
  });
}

function keepFocusInsideMobileFilters(event) {
  if (event.key !== "Tab" || !sidebar?.classList.contains("open")) {
    return;
  }

  const focusableElements = getMobileFilterFocusableElements();

  if (focusableElements.length === 0) {
    event.preventDefault();
    sidebar.focus();
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements.at(-1);
  const activeElement = document.activeElement;

  if (!sidebar.contains(activeElement)) {
    event.preventDefault();
    (event.shiftKey ? lastElement : firstElement).focus();
    return;
  }

  if (event.shiftKey && activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
    return;
  }

  if (!event.shiftKey && activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

function syncMobileFilterAccessibility() {
  if (!sidebar || !filterOpenButton) {
    return;
  }

  const mobileFiltersAreAvailable =
    window.getComputedStyle(filterOpenButton).display !== "none";

  if (mobileFiltersAreAvailable) {
    sidebar.setAttribute("role", "dialog");
    sidebar.setAttribute(
      "aria-hidden",
      String(!sidebar.classList.contains("open")),
    );
    return;
  }

  sidebar.classList.remove("open");
  sidebar.removeAttribute("role");
  sidebar.removeAttribute("aria-modal");
  sidebar.removeAttribute("aria-hidden");

  filterBackdrop?.classList.remove("open");
  filterBackdrop?.setAttribute("aria-hidden", "true");
  filterOpenButton.setAttribute("aria-expanded", "false");

  document.body.style.overflow = "";
}

filterOpenButton?.addEventListener("click", openMobileFilters);

filterCloseButton?.addEventListener("click", closeMobileFilters);

filterBackdrop?.addEventListener("click", closeMobileFilters);

document.addEventListener("keydown", (event) => {
  if (!sidebar?.classList.contains("open")) {
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    closeMobileFilters();
    return;
  }

  keepFocusInsideMobileFilters(event);
});

window.addEventListener("resize", syncMobileFilterAccessibility);

syncMobileFilterAccessibility();

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
