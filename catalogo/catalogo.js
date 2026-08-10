import "./catalogo.css";
import productsData from "../src/data/products.json";

import { createProductCard } from "../src/components/product-card/product-card.js";
import { escapeAttribute, escapeHTML } from "../src/utils/escape.js";
import { formatDrinkLabel } from "../src/utils/products.js";
import {
  getProductSearchText,
  normalizeSearchText,
} from "../src/utils/search.js";
import {
  trackEvent,
  trackFilter,
  trackSort,
  trackViewItemList,
} from "../src/services/analytics.js";

/* ==========================================
   ESTADO DEL CATÁLOGO
========================================== */

let products = [];
let filteredProducts = [];

const selectedCategories = new Set();
const selectedCollections = new Set();
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
let priceAnalyticsTimer = null;
let availableCollectionSuggestions = [];
let activeCollectionSuggestionIndex = -1;
let productsPerPage = 18;
let catalogResizeTimer = null;
let viewMode = "normal";
let productRenderVersion = 0;

const BASE_PRODUCTS_PER_PAGE = 18;
const CATALOG_BANNER_IMAGE = "/assets/images/Bannerproductos.png";

/*
 * Configuración temporal de banners.
 * El cliente podrá reemplazar imágenes, títulos, textos y orden sin tocar
 * products.json ni la lógica de agrupación.
 */
const CATEGORY_BANNERS = {
  copas: {
    description: "Cristalería diseñada para realzar cada estilo de vino.",
  },
  vasos: {
    description: "Diseño y funcionalidad para distintas bebidas y ocasiones.",
  },
  decantadores: {
    description: "Piezas creadas para servir y disfrutar el vino con elegancia.",
  },
  kits: {
    description: "Selecciones de cristalería para experiencias completas.",
  },
};

const COLLECTION_BANNERS = {
  winelovers: {
    description: "Formas versátiles para descubrir el carácter de cada vino.",
  },
  "beer classics": {
    description: "Cristalería desarrollada para distintos estilos de cerveza.",
  },
  "special glasses": {
    description: "Diseños especializados para cócteles y destilados.",
  },
  "authentis casual": {
    description: "Elegancia contemporánea para disfrutar todos los días.",
  },
};

const COLLECTION_ORDER = [
  "winelovers",
  "authentis casual",
  "definition",
  "definition pro",
  "beer classics",
  "special glasses",
];

const DEFAULT_BANNER = {
  description: "Descubre los productos disponibles en esta selección Spiegelau.",
};

/* ==========================================
   ELEMENTOS DEL DOM
========================================== */

const productGrid = document.getElementById("catalog-product-grid");

const selectionFilters = document.getElementById("selection-filters");

const categoryFilters = document.getElementById("category-filters");

const collectionFilters = document.getElementById("collection-filters");

const drinkFilters = document.getElementById("drink-filters");

const collectionSearch = document.getElementById("collection-search");

const collectionSearchContainer = document.getElementById(
  "collection-search-container",
);

const collectionSearchResults = document.getElementById(
  "collection-search-results",
);

const minimumPriceInput = document.getElementById("minimum-price");

const maximumPriceInput = document.getElementById("maximum-price");

const minimumPriceValue = document.getElementById("minimum-price-value");

const maximumPriceValue = document.getElementById("maximum-price-value");

const priceRangeControl = document.getElementById("price-range-control");
const clearFiltersButton = document.getElementById("clear-filters");
const applyFiltersButton = document.getElementById("apply-filters");

const emptyClearFiltersButton = document.getElementById("empty-clear-filters");

const sortSelect = document.getElementById("catalog-sort-select");
let customSortButton = null;
let customSortOptions = [];

const resultsCount = document.getElementById("catalog-results-count");

const emptyState = document.getElementById("catalog-empty-state");

const pagination = document.getElementById("catalog-pagination");

const categoryView = document.getElementById(
  "catalog-category-view",
);

const collectionsView = document.getElementById(
  "catalog-collections-view",
);

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

function normalizeFacetValue(value = "") {
  return normalizeSearchText(value)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
}

function isCollectionsViewActive() {
  return (
    selectedCategories.size === 0 &&
    (viewMode === "collections" || selectedCollections.size > 0)
  );
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

  const collectionMatches =
    ignoredFacet === "collection" ||
    selectedCollections.size === 0 ||
    selectedCollections.has(product.collection);

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
    collectionMatches &&
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
  const normalizedAvailableValues = new Map(
    [...availableValues]
      .filter(Boolean)
      .map((value) => [normalizeFacetValue(value), value]),
  );

  selectedValues.clear();

  if (!parameterValue) {
    return;
  }

  parameterValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => {
      const availableValue = normalizedAvailableValues.get(
        normalizeFacetValue(value),
      );

      if (availableValue) {
        selectedValues.add(availableValue);
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

    if (parameterName === "coleccion") {
      url.searchParams.delete("vista");
      viewMode = "normal";
    }
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

  viewMode = params.get("vista") === "colecciones"
    ? "collections"
    : "normal";

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
    "coleccion",
    selectedCollections,
    new Set(products.map((product) => product.collection)),
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

  [
    ["selection", "seleccion"],
    ["category", "categoria"],
    ["collection", "coleccion"],
    ["drink_type", "bebida"],
  ].forEach(([type, parameter]) => {
    const value = params.get(parameter);
    if (value) trackFilter(type, value, filteredProducts.length, "url");
  });
}

function syncCustomSortSelect() {
  if (!sortSelect || !customSortButton) return;

  const selectedOption = sortSelect.options[sortSelect.selectedIndex];
  customSortButton.querySelector(".catalog-sort-custom__value").textContent =
    selectedOption?.textContent.trim() || "Recomendados";

  customSortOptions.forEach((option) => {
    const isSelected = option.dataset.value === sortSelect.value;
    option.classList.toggle("is-selected", isSelected);
    option.setAttribute("aria-selected", String(isSelected));
  });
}

function initCustomSortSelect() {
  if (!sortSelect || sortSelect.dataset.customSelectReady === "true") return;

  sortSelect.dataset.customSelectReady = "true";
  sortSelect.classList.add("catalog-sort__native");

  const customSelect = document.createElement("div");
  customSelect.className = "catalog-sort-custom";
  customSelect.innerHTML = `
    <button
      class="catalog-sort-custom__trigger"
      type="button"
      aria-haspopup="listbox"
      aria-expanded="false"
    >
      <span class="catalog-sort-custom__value"></span>
      <span class="material-symbols-outlined" aria-hidden="true">expand_more</span>
    </button>
    <div class="catalog-sort-custom__menu" role="listbox" aria-label="Ordenar productos" hidden></div>
  `;

  customSortButton = customSelect.querySelector(".catalog-sort-custom__trigger");
  const menu = customSelect.querySelector(".catalog-sort-custom__menu");

  [...sortSelect.options].forEach((nativeOption) => {
    const option = document.createElement("button");
    option.className = "catalog-sort-custom__option";
    option.type = "button";
    option.setAttribute("role", "option");
    option.dataset.value = nativeOption.value;
    option.innerHTML = `
      <span>${escapeHTML(nativeOption.textContent.trim())}</span>
      <span class="material-symbols-outlined" aria-hidden="true">check</span>
    `;
    menu.append(option);
  });

  customSortOptions = [...menu.querySelectorAll(".catalog-sort-custom__option")];
  sortSelect.insertAdjacentElement("afterend", customSelect);

  const closeMenu = ({ restoreFocus = false } = {}) => {
    if (menu.hidden) return;
    menu.hidden = true;
    customSelect.classList.remove("is-open");
    customSortButton.setAttribute("aria-expanded", "false");
    if (restoreFocus) customSortButton.focus();
  };

  const openMenu = () => {
    menu.hidden = false;
    customSelect.classList.add("is-open");
    customSortButton.setAttribute("aria-expanded", "true");
  };

  customSortButton.addEventListener("click", () => {
    if (menu.hidden) {
      openMenu();
      return;
    }
    closeMenu();
  });

  customSortButton.addEventListener("keydown", (event) => {
    if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    openMenu();
    const selectedIndex = Math.max(
      0,
      customSortOptions.findIndex((option) => option.classList.contains("is-selected")),
    );
    customSortOptions[selectedIndex]?.focus();
  });

  menu.addEventListener("click", (event) => {
    const option = event.target.closest(".catalog-sort-custom__option");
    if (!option) return;

    sortSelect.value = option.dataset.value;
    syncCustomSortSelect();
    sortSelect.dispatchEvent(new Event("change", { bubbles: true }));
    closeMenu({ restoreFocus: true });
  });

  menu.addEventListener("keydown", (event) => {
    const currentIndex = customSortOptions.indexOf(document.activeElement);

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
      return;
    }

    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();

    let nextIndex = currentIndex;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = customSortOptions.length - 1;
    if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % customSortOptions.length;
    if (event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + customSortOptions.length) % customSortOptions.length;
    }
    customSortOptions[nextIndex]?.focus();
  });

  sortSelect.addEventListener("change", syncCustomSortSelect);
  document.addEventListener("click", (event) => {
    if (!customSelect.contains(event.target)) closeMenu();
  });

  syncCustomSortSelect();
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
   GENERAR COLECCIONES
========================================== */

function generateCollectionFilters() {
  if (!collectionFilters) {
    return;
  }

  const collectionCounts = countByProperty("collection", "collection");

  const collections = [
    ...new Set([
      ...Object.keys(collectionCounts),
      ...selectedCollections,
    ]),
  ]
    .filter(Boolean)
    .sort((a, b) =>
      a.localeCompare(b, "es", {
        sensitivity: "base",
      }),
    );

  collectionFilters.innerHTML = collections
    .map(
      (collection) => `
        <label
          class="filter-option"
          data-collection-option
          data-collection-name="${escapeAttribute(normalizeSearchText(collection))}"
        >
          <input
            type="checkbox"
            name="collection"
            value="${escapeAttribute(collection)}"
          />

          <span>
            ${escapeHTML(collection)}
          </span>

          <small>
            (${collectionCounts[collection] || 0})
          </small>
        </label>
      `,
    )
    .join("");

  availableCollectionSuggestions = collections;
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

  window.clearTimeout(priceAnalyticsTimer);
  priceAnalyticsTimer = window.setTimeout(() => {
    trackFilter(
      "price",
      `${minimumPriceInput.value}-${maximumPriceInput.value}`,
      filteredProducts.length,
      "user",
    );
  }, 500);
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

  if (isCollectionsViewActive()) {
    currentPage = 1;
  }

  currentPage = Math.min(currentPage, getTotalPages());
  updatePageParameter();
  updateApplyFiltersButton();
  renderProducts();
}

function updateApplyFiltersButton() {
  if (!applyFiltersButton) {
    return;
  }

  const productLabel = filteredProducts.length === 1
    ? "producto"
    : "productos";

  applyFiltersButton.textContent =
    `Aplicar filtros · ${filteredProducts.length} ${productLabel}`;
}

function applyCollectionSearch() {
  const searchValue = normalizeSearchText(collectionSearch?.value || "");

  collectionFilters?.querySelectorAll("[data-collection-option]").forEach((option) => {
    const collectionName = option.dataset.collectionName || "";

    option.hidden = !collectionName.includes(searchValue);
  });

  renderCollectionSearchResults(searchValue);
}

function closeCollectionSearchResults() {
  if (!collectionSearch || !collectionSearchResults) {
    return;
  }

  collectionSearchResults.hidden = true;
  collectionSearchResults.replaceChildren();
  collectionSearch.setAttribute("aria-expanded", "false");
  collectionSearch.removeAttribute("aria-activedescendant");
  activeCollectionSuggestionIndex = -1;
}

function getCollectionResultElements() {
  return [
    ...(collectionSearchResults?.querySelectorAll("[data-collection-suggestion]") || []),
  ];
}

function updateActiveCollectionSuggestion() {
  const resultElements = getCollectionResultElements();

  resultElements.forEach((result, index) => {
    const isActive = index === activeCollectionSuggestionIndex;

    result.classList.toggle("is-active", isActive);
    result.setAttribute("aria-selected", String(isActive));
  });

  const activeResult = resultElements[activeCollectionSuggestionIndex];

  if (activeResult) {
    collectionSearch?.setAttribute("aria-activedescendant", activeResult.id);
    activeResult.scrollIntoView({ block: "nearest" });
  } else {
    collectionSearch?.removeAttribute("aria-activedescendant");
  }
}

function renderCollectionSearchResults(searchValue) {
  if (!collectionSearch || !collectionSearchResults) {
    return;
  }

  activeCollectionSuggestionIndex = -1;

  if (!searchValue) {
    closeCollectionSearchResults();
    return;
  }

  const matchingCollections = availableCollectionSuggestions.filter((collection) => {
    return normalizeSearchText(collection).includes(searchValue);
  });

  if (matchingCollections.length === 0) {
    collectionSearchResults.innerHTML = `
      <p class="filter-collection-search__empty">
        No encontramos colecciones con “${escapeHTML(collectionSearch.value.trim())}”.
      </p>
    `;
  } else {
    collectionSearchResults.innerHTML = matchingCollections
      .map((collection, index) => {
        return `
          <button
            id="collection-suggestion-${index}"
            class="filter-collection-search__result"
            type="button"
            role="option"
            aria-selected="false"
            data-collection-suggestion="${escapeAttribute(collection)}"
          >
            <span>${escapeHTML(collection)}</span>
          </button>
        `;
      })
      .join("");
  }

  collectionSearchResults.hidden = false;
  collectionSearch.setAttribute("aria-expanded", "true");
}

function selectCollectionSuggestions(collections) {
  const validCollections = collections.filter(Boolean);

  if (validCollections.length === 0) {
    return;
  }

  validCollections.forEach((collection) => {
    selectedCollections.add(collection);
  });

  updateSetParameter("coleccion", selectedCollections);

  if (collectionSearch) {
    collectionSearch.value = "";
  }

  closeCollectionSearchResults();
  applyFilters();
  validCollections.forEach((collection) => {
    trackFilter("collection", collection, filteredProducts.length, "user");
    trackEvent("collection_click", {
      collection_name: collection,
      link_url: `${window.location.origin}${window.location.pathname}`,
    });
  });
}

function selectCollectionSuggestion(collection) {
  selectCollectionSuggestions([collection]);
}

function updateAvailableFilters() {
  generateSelectionFilters();
  generateCategoryFilters();
  generateCollectionFilters();
  generateDrinkFilters();

  syncCheckboxes(selectionFilters, "selection", selectedSelections);
  syncCheckboxes(categoryFilters, "category", selectedCategories);
  syncCheckboxes(collectionFilters, "collection", selectedCollections);
  syncCheckboxes(drinkFilters, "drink", selectedDrinks);

  applyCollectionSearch();
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

function getBannerConfiguration(type, name) {
  const normalizedName = normalizeFacetValue(name);
  const configurations = type === "category"
    ? CATEGORY_BANNERS
    : COLLECTION_BANNERS;

  return configurations[normalizedName] || DEFAULT_BANNER;
}

function createCatalogBanner({
  type,
  name,
  title,
  eyebrowText = "",
  descriptionText = "",
}) {
  const configuration = getBannerConfiguration(type, name);
  const banner = document.createElement("div");
  const image = document.createElement("img");
  const overlay = document.createElement("div");
  const content = document.createElement("div");
  const eyebrow = document.createElement("span");
  const heading = document.createElement("h2");
  const description = document.createElement("p");

  banner.className = `catalog-feature-banner catalog-feature-banner--${type}`;
  image.src = CATALOG_BANNER_IMAGE;
  image.alt =
    type === "combined"
      ? `Colección y categoría ${title}`
      : `${type === "category" ? "Categoría" : "Colección"} ${title}`;
  image.width = 1600;
  image.height = 600;
  image.loading = "lazy";
  overlay.className = "catalog-feature-banner__overlay";
  content.className = "catalog-feature-banner__content";
  eyebrow.textContent =
    eyebrowText || (type === "category" ? "Categoría" : "Colección");
  heading.textContent = title;
  description.textContent = descriptionText || configuration.description;

  content.append(eyebrow, heading, description);
  banner.append(image, overlay, content);

  return banner;
}

function formatBannerTitle(value) {
  return String(value)
    .replace(/[-_]+/g, " ")
    .toLocaleLowerCase("es")
    .replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase("es"));
}

function formatBannerValues(values) {
  return values.map(formatBannerTitle).join(", ");
}

function createCombinedFilterBanner(categoryName) {
  const collections = [...selectedCollections];
  const collectionNames = formatBannerValues(collections);
  const categoryTitle = formatBannerTitle(categoryName);
  const collectionPrefix = collections.length === 1
    ? "Colección"
    : "Colecciones";

  return createCatalogBanner({
    type: "combined",
    name: collections[0],
    title:
      `${collectionPrefix} ${collectionNames} - ` +
      categoryTitle,
    eyebrowText: "Colección y categoría",
    descriptionText:
      `Explora los productos de ${collectionNames} ` +
      `disponibles en ${categoryTitle}.`,
  });
}

async function createCombinedCategoryGroup(categoryName, categoryProducts) {
  const section = document.createElement("section");
  const productsContainer = document.createElement("div");
  const cards = await Promise.all(
    categoryProducts.map((product) => createProductCard(product)),
  );

  section.className = "catalog-category-group";
  section.dataset.category = categoryName;
  productsContainer.className =
    "catalog-product-grid catalog-category-group__products";
  productsContainer.innerHTML = cards.join("");
  section.append(
    createCombinedFilterBanner(categoryName),
    productsContainer,
  );

  return section;
}

async function renderCombinedCategoryGroupsView(renderVersion) {
  if (!categoryView || !resultsCount || !pagination) {
    return;
  }

  const groups = [...selectedCategories]
    .map((categoryName) => ({
      name: categoryName,
      products: filteredProducts.filter(
        (product) => product.category === categoryName,
      ),
    }))
    .filter((group) => group.products.length > 0);
  const sections = await Promise.all(
    groups.map((group) => (
      createCombinedCategoryGroup(group.name, group.products)
    )),
  );

  if (renderVersion !== productRenderVersion) {
    return;
  }

  categoryView.replaceChildren(...sections);
  categoryView.hidden = false;
  resultsCount.textContent =
    `Mostrando ${filteredProducts.length} productos en ${groups.length} categorías`;
  pagination.replaceChildren();
  pagination.hidden = true;
  sections.forEach((section, index) => {
    trackViewItemList(
      section.querySelector(".catalog-product-grid"),
      groups[index].products,
      `collection_category_${groups[index].name}`,
      `Colección y categoría ${groups[index].name}`,
      searchQuery,
    );
  });
}

function hideCatalogFeatureViews() {
  if (categoryView) {
    categoryView.hidden = true;
    categoryView.replaceChildren();
  }

  if (collectionsView) {
    collectionsView.hidden = true;
    collectionsView.replaceChildren();
  }
}

function renderCategoryView() {
  if (!categoryView) {
    return;
  }

  const categories = [...selectedCategories];
  const banners = categories.map((categoryName) => {
    return createCatalogBanner({
      type: "category",
      name: categoryName,
      title: formatLabel(categoryName),
    });
  });

  categoryView.replaceChildren(...banners);
  categoryView.hidden = false;
}

async function createCategoryGroup(categoryName, categoryProducts) {
  const section = document.createElement("section");
  const productsContainer = document.createElement("div");
  const cards = await Promise.all(
    categoryProducts.map((product) => createProductCard(product)),
  );

  section.className = "catalog-category-group";
  section.dataset.category = categoryName;
  productsContainer.className =
    "catalog-product-grid catalog-category-group__products";
  productsContainer.innerHTML = cards.join("");
  section.append(
    createCatalogBanner({
      type: "category",
      name: categoryName,
      title: formatLabel(categoryName),
    }),
    productsContainer,
  );

  return section;
}

async function renderCategoryGroupsView(renderVersion) {
  if (!categoryView || !resultsCount || !pagination) {
    return;
  }

  const groups = [...selectedCategories]
    .map((categoryName) => ({
      name: categoryName,
      products: filteredProducts.filter(
        (product) => product.category === categoryName,
      ),
    }))
    .filter((group) => group.products.length > 0);
  const sections = await Promise.all(
    groups.map((group) => createCategoryGroup(group.name, group.products)),
  );

  if (renderVersion !== productRenderVersion) {
    return;
  }

  categoryView.replaceChildren(...sections);
  categoryView.hidden = false;
  resultsCount.textContent =
    `Mostrando ${filteredProducts.length} productos en ${groups.length} categorías`;
  pagination.replaceChildren();
  pagination.hidden = true;
  sections.forEach((section, index) => {
    trackViewItemList(
      section.querySelector(".catalog-product-grid"),
      groups[index].products,
      `category_${groups[index].name}`,
      `Categoría ${formatLabel(groups[index].name)}`,
      searchQuery,
    );
  });
}

function groupProductsByCollection(productsToGroup) {
  const groups = new Map();

  productsToGroup.forEach((product) => {
    const collectionName = product.collection?.trim();

    if (!collectionName) {
      return;
    }

    const key = normalizeFacetValue(collectionName);

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        name: collectionName,
        products: [],
      });
    }

    groups.get(key).products.push(product);
  });

  const orderIndexes = new Map(
    COLLECTION_ORDER.map((collection, index) => [collection, index]),
  );

  return [...groups.values()].sort((groupA, groupB) => {
    const indexA = orderIndexes.get(groupA.key) ?? Number.MAX_SAFE_INTEGER;
    const indexB = orderIndexes.get(groupB.key) ?? Number.MAX_SAFE_INTEGER;

    if (indexA !== indexB) {
      return indexA - indexB;
    }

    return groupA.name.localeCompare(groupB.name, "es", {
      sensitivity: "base",
    });
  });
}

async function createCollectionGroup(group) {
  const section = document.createElement("section");
  const productsContainer = document.createElement("div");
  const cards = await Promise.all(
    group.products.map((product) => createProductCard(product)),
  );

  section.className = "catalog-collection-group";
  section.dataset.collection = group.name;
  productsContainer.className =
    "catalog-product-grid catalog-collection-group__products";
  productsContainer.innerHTML = cards.join("");
  section.append(
    createCatalogBanner({
      type: "collection",
      name: group.name,
      title: group.name,
    }),
    productsContainer,
  );

  return section;
}

async function renderCollectionsView(renderVersion) {
  if (!collectionsView || !resultsCount || !pagination) {
    return;
  }

  const groups = groupProductsByCollection(filteredProducts);
  const groupedProductCount = groups.reduce((total, group) => {
    return total + group.products.length;
  }, 0);

  if (groups.length === 0) {
    collectionsView.hidden = true;
    collectionsView.replaceChildren();
    resultsCount.textContent = "Mostrando 0 productos";
    emptyState.hidden = false;
    pagination.replaceChildren();
    pagination.hidden = true;
    return;
  }

  const sections = await Promise.all(groups.map(createCollectionGroup));

  if (renderVersion !== productRenderVersion) {
    return;
  }

  const fragment = document.createDocumentFragment();
  sections.forEach((section) => fragment.append(section));

  collectionsView.replaceChildren(fragment);
  collectionsView.hidden = false;
  resultsCount.textContent =
    `Mostrando ${groupedProductCount} productos en ${groups.length} colecciones`;
  pagination.replaceChildren();
  pagination.hidden = true;
  sections.forEach((section, index) => {
    trackViewItemList(
      section.querySelector(".catalog-product-grid"),
      groups[index].products,
      `collection_${groups[index].key}`,
      `Colección ${groups[index].name}`,
      searchQuery,
    );
  });
}

async function renderProducts() {
  const renderVersion = ++productRenderVersion;

  if (!productGrid || !resultsCount || !emptyState) {
    return;
  }

  if (filteredProducts.length === 0) {
    hideCatalogFeatureViews();
    productGrid.innerHTML = "";
    productGrid.hidden = true;
    resultsCount.textContent = "Mostrando 0 productos";
    emptyState.hidden = false;
    renderPagination();
    return;
  }

  emptyState.hidden = true;

  if (selectedCategories.size > 0 && selectedCollections.size > 0) {
    collectionsView?.replaceChildren();
    if (collectionsView) collectionsView.hidden = true;

    productGrid.innerHTML = "";
    productGrid.hidden = true;
    await renderCombinedCategoryGroupsView(renderVersion);
    return;
  }

  if (selectedCategories.size > 0) {
    collectionsView?.replaceChildren();
    if (collectionsView) collectionsView.hidden = true;

    if (selectedCategories.size > 1) {
      productGrid.innerHTML = "";
      productGrid.hidden = true;
      await renderCategoryGroupsView(renderVersion);
      return;
    }

    renderCategoryView();
    productGrid.hidden = false;
    await renderPaginatedProducts(renderVersion);
    return;
  }

  if (isCollectionsViewActive()) {
    if (categoryView) {
      categoryView.hidden = true;
      categoryView.replaceChildren();
    }
    productGrid.innerHTML = "";
    productGrid.hidden = true;
    await renderCollectionsView(renderVersion);
    return;
  }

  hideCatalogFeatureViews();
  productGrid.hidden = false;
  await renderPaginatedProducts(renderVersion);
}

async function renderPaginatedProducts(renderVersion) {
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

  const firstProductIndex = (currentPage - 1) * productsPerPage;
  const lastProductIndex = Math.min(
    firstProductIndex + productsPerPage,
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

  if (renderVersion !== productRenderVersion) {
    return;
  }

  productGrid.innerHTML = cards.join("");
  trackViewItemList(
    productGrid,
    visibleProducts,
    `catalog_results_page_${currentPage}`,
    "Resultados del catálogo",
    searchQuery,
  );
  renderPagination();
}

/* ==========================================
   PAGINACIÓN
========================================== */

function getTotalPages() {
  return Math.max(
    1,
    Math.ceil(filteredProducts.length / productsPerPage),
  );
}

function getCatalogColumnCount() {
  if (!productGrid) {
    return 1;
  }

  const gridTemplateColumns = window
    .getComputedStyle(productGrid)
    .gridTemplateColumns.trim();

  if (!gridTemplateColumns || gridTemplateColumns === "none") {
    return 1;
  }

  return gridTemplateColumns.split(/\s+/).length;
}

function calculateProductsPerPage() {
  const columnCount = getCatalogColumnCount();

  return Math.ceil(BASE_PRODUCTS_PER_PAGE / columnCount) * columnCount;
}

function updateProductsPerPage({ rerender = true } = {}) {
  const nextProductsPerPage = calculateProductsPerPage();

  if (nextProductsPerPage === productsPerPage) {
    return;
  }

  const firstVisibleProductIndex =
    (currentPage - 1) * productsPerPage;

  productsPerPage = nextProductsPerPage;
  currentPage = Math.floor(firstVisibleProductIndex / productsPerPage) + 1;
  currentPage = Math.min(currentPage, getTotalPages());

  if (rerender && products.length > 0) {
    updatePageParameter();
    renderProducts();
  }
}

function handleCatalogResize() {
  window.clearTimeout(catalogResizeTimer);

  catalogResizeTimer = window.setTimeout(() => {
    updateProductsPerPage();
  }, 120);
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
    trackFilter(inputName, checkbox.value, filteredProducts.length, "user");
    if (checkbox.checked && ["category", "collection", "drink"].includes(inputName)) {
      const eventNames = {
        category: ["category_click", "category_name"],
        collection: ["collection_click", "collection_name"],
        drink: ["drink_type_click", "drink_type"],
      };
      const [eventName, valueName] = eventNames[inputName];
      trackEvent(eventName, {
        [valueName]: checkbox.value,
        link_url: `${window.location.origin}${window.location.pathname}`,
      });
    }
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
  collectionFilters,
  "collection",
  "coleccion",
  selectedCollections,
);

setupSetFilter(
  drinkFilters,
  "drink",
  "bebida",
  selectedDrinks,
);

/* ==========================================
   BUSCAR COLECCIONES
========================================== */

collectionSearch?.addEventListener("input", () => {
  applyCollectionSearch();
});

collectionSearch?.addEventListener("focus", () => {
  applyCollectionSearch();
});

collectionSearch?.addEventListener("keydown", (event) => {
  const resultElements = getCollectionResultElements();

  if (event.key === "Escape") {
    closeCollectionSearchResults();
    return;
  }

  if (resultElements.length === 0) {
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();

    activeCollectionSuggestionIndex =
      activeCollectionSuggestionIndex < resultElements.length - 1
        ? activeCollectionSuggestionIndex + 1
        : 0;

    updateActiveCollectionSuggestion();
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();

    activeCollectionSuggestionIndex =
      activeCollectionSuggestionIndex > 0
        ? activeCollectionSuggestionIndex - 1
        : resultElements.length - 1;

    updateActiveCollectionSuggestion();
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();

    if (activeCollectionSuggestionIndex >= 0) {
      selectCollectionSuggestion(
        resultElements[activeCollectionSuggestionIndex]?.dataset.collectionSuggestion,
      );
      return;
    }

    selectCollectionSuggestions(
      resultElements.map((result) => result.dataset.collectionSuggestion),
    );
  }
});

collectionSearchResults?.addEventListener("click", (event) => {
  const result = event.target.closest("[data-collection-suggestion]");

  if (!result) {
    return;
  }

  selectCollectionSuggestion(result.dataset.collectionSuggestion);
});

document.addEventListener("click", (event) => {
  if (!collectionSearchContainer?.contains(event.target)) {
    closeCollectionSearchResults();
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
  trackSort(sortValue, filteredProducts.length);
});

/* ==========================================
   LIMPIAR FILTROS
========================================== */

function clearFilters() {
  selectedSelections.clear();
  selectedCategories.clear();
  selectedCollections.clear();
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

  if (collectionSearch) {
    collectionSearch.value = "";
  }

  if (sortSelect) {
    sortSelect.value = "default";
    syncCustomSortSelect();
  }

  collectionFilters?.querySelectorAll("[data-collection-option]").forEach((option) => {
    option.hidden = false;
  });

  updatePriceRangePresentation();
  updateSetParameter("seleccion", selectedSelections);
  updateSetParameter("categoria", selectedCategories);
  updateSetParameter("coleccion", selectedCollections);
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

const filterGroupButtons = Array.from(
  document.querySelectorAll(".filter-group-title"),
);

function isDesktopFilterBar() {
  return window.matchMedia("(min-width: 1025px)").matches;
}

function setFilterGroupExpanded(button, isExpanded) {
  button.setAttribute("aria-expanded", String(isExpanded));

  const icon = button.querySelector(".material-symbols-outlined");

  if (icon) {
    icon.textContent = isExpanded
      ? isDesktopFilterBar()
        ? "expand_less"
        : "remove"
      : isDesktopFilterBar()
        ? "expand_more"
        : "add";
  }
}

function closeDesktopFilterGroups(exceptButton = null) {
  filterGroupButtons.forEach((button) => {
    if (button !== exceptButton) {
      setFilterGroupExpanded(button, false);
    }
  });
}

filterGroupButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const isExpanded = button.getAttribute("aria-expanded") === "true";

    if (isDesktopFilterBar()) {
      closeDesktopFilterGroups(button);
    }

    setFilterGroupExpanded(button, !isExpanded);
  });
});

document.addEventListener("click", (event) => {
  if (
    isDesktopFilterBar() &&
    event.target instanceof Node &&
    !sidebar?.contains(event.target)
  ) {
    closeDesktopFilterGroups();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !isDesktopFilterBar()) {
    return;
  }

  const expandedButton = filterGroupButtons.find((button) => {
    return button.getAttribute("aria-expanded") === "true";
  });

  if (!expandedButton) {
    return;
  }

  event.preventDefault();
  closeDesktopFilterGroups();
  expandedButton.focus();
});

function syncFilterGroupPresentation() {
  closeDesktopFilterGroups();
}

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
applyFiltersButton?.addEventListener("click", closeMobileFilters);

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
window.addEventListener("resize", syncFilterGroupPresentation);
window.addEventListener("resize", handleCatalogResize);

syncMobileFilterAccessibility();
syncFilterGroupPresentation();
initCustomSortSelect();

/* ==========================================
   INICIALIZAR
========================================== */

async function initializeCatalog() {
  try {
    updateProductsPerPage({ rerender: false });
    await loadProducts();
  } catch (error) {
    console.error("Error al inicializar el catálogo:", error);

    if (resultsCount) {
      resultsCount.textContent = "No se pudieron cargar los productos";
    }
  }
}

initializeCatalog();
