import "./header.css";
import headerHTML from "./header.html?raw";
import products from "../../data/products.json";
import { escapeAttribute, escapeHTML } from "../../utils/escape.js";
import {
  getPrimaryProductImage,
} from "../../utils/products.js";
import {
  getProductSearchText,
  normalizeSearchText,
} from "../../utils/search.js";
import {
  createCatalogUrl,
  createProductUrl,
} from "../../utils/urls.js";
import { trackSearch, trackSelectItem } from "../../services/analytics.js";

/* =====================================================
   CONFIGURACIÓN DEL BUSCADOR
===================================================== */

const MAX_RESULTS = 6;

const priceFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

let mobileMenuAbortController = null;
let headerSearchAbortController = null;

/* =====================================================
   CARGAR HEADER
===================================================== */

export async function loadHeader() {
  const headerContainer = document.getElementById("header-container");

  if (!headerContainer) {
    console.error('No se encontró el elemento con id="header-container".');
    return;
  }

  try {
    headerContainer.innerHTML = headerHTML;
    await loadCategories(); 


    initHeaderSearch();
    initMobileMenu();
  } catch (error) {
    console.error("Error al cargar el header:", error);
  }
}

/* ==========================================
   CARGAR CATEGORÍAS
========================================== */


function loadCategories() {
  const menus = document.querySelectorAll(
    "#header-categories-menu, #mobile-header-categories-menu",
  );


  if (menus.length === 0) {
    return;
  }


  const categories = [
    ...new Set(
      products.map((product) => product.category),
    ),
  ].filter(Boolean).sort();


  const categoryItems = categories
    .map(
      (category) => `
        <li>
          <a href="${escapeAttribute(
            createCatalogUrl({ categoria: category }),
          )}"
            data-analytics-event="category_click"
            data-analytics-value="${escapeAttribute(category)}"
          >
            ${escapeHTML(formatCategory(category))}
          </a>
        </li>
      `,
    )
    .join("");


  menus.forEach((menu) => {
    menu.innerHTML = `
    <li>
      <a href="/catalogo/">
        Todos los productos
      </a>
    </li>
    ${categoryItems}
    <li>
      <a href="/colecciones/">
        Colecciones
      </a>
    </li>
  `;
  });
}

/* ==========================================
   FORMATEAR CATEGORÍA
========================================== */


function formatCategory(category) {
  return category
    .split("-")
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/* =====================================================
   MENÚ MÓVIL
===================================================== */

function initMobileMenu() {
  const menuToggle = document.getElementById("mobile-menu-toggle");
  const menuPanel = document.getElementById("mobile-menu-panel");
  const menuOverlay = document.getElementById("mobile-menu-overlay");
  const menuClose = document.getElementById("mobile-menu-close");
  const productsToggle = document.getElementById("mobile-products-toggle");
  const categoriesMenu = document.getElementById(
    "mobile-header-categories-menu",
  );

  if (
    !menuToggle ||
    !menuPanel ||
    !menuOverlay ||
    !menuClose ||
    !productsToggle ||
    !categoriesMenu
  ) {
    return;
  }

  mobileMenuAbortController?.abort();
  mobileMenuAbortController = new AbortController();

  const { signal } = mobileMenuAbortController;

  const focusableSelector = [
    'a[href]:not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");

  function isMobileMenuOpen() {
    return menuPanel.classList.contains("is-open");
  }

  function closeProductsMenu() {
    productsToggle.setAttribute("aria-expanded", "false");
    categoriesMenu.hidden = true;
  }

  function getMobileMenuFocusableElements() {
    return Array.from(
      menuPanel.querySelectorAll(focusableSelector),
    ).filter((element) => {
      return (
        element instanceof HTMLElement &&
        !element.hidden &&
        element.getAttribute("aria-hidden") !== "true" &&
        element.getClientRects().length > 0
      );
    });
  }

  function openMobileMenu() {
    if (
      isMobileMenuOpen() ||
      !window.matchMedia("(max-width: 768px)").matches
    ) {
      return;
    }

    menuPanel.classList.add("is-open");
    menuOverlay.classList.add("is-open");

    menuPanel.setAttribute("aria-hidden", "false");
    menuOverlay.setAttribute("aria-hidden", "false");
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Cerrar menú de navegación");

    document.body.classList.add("mobile-menu-open");

    window.requestAnimationFrame(() => {
      menuClose.focus();
    });
  }

  function closeMobileMenu({ restoreFocus = true } = {}) {
    const menuWasOpen = isMobileMenuOpen();

    menuPanel.classList.remove("is-open");
    menuOverlay.classList.remove("is-open");

    menuPanel.setAttribute("aria-hidden", "true");
    menuOverlay.setAttribute("aria-hidden", "true");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menú de navegación");

    document.body.classList.remove("mobile-menu-open");
    closeProductsMenu();

    if (menuWasOpen && restoreFocus && menuToggle.isConnected) {
      window.requestAnimationFrame(() => {
        menuToggle.focus();
      });
    }
  }

  function toggleMobileMenu() {
    if (isMobileMenuOpen()) {
      closeMobileMenu();
      return;
    }

    openMobileMenu();
  }

  function handleMobileMenuKeydown(event) {
    if (!isMobileMenuOpen()) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMobileMenu();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = getMobileMenuFocusableElements();

    if (focusableElements.length === 0) {
      event.preventDefault();
      menuPanel.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements.at(-1);
    const activeElement = document.activeElement;

    if (!menuPanel.contains(activeElement)) {
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

  menuToggle.addEventListener("click", toggleMobileMenu, { signal });
  menuClose.addEventListener("click", () => closeMobileMenu(), { signal });
  menuOverlay.addEventListener("click", () => closeMobileMenu(), { signal });

  productsToggle.addEventListener(
    "click",
    () => {
      const isExpanded =
        productsToggle.getAttribute("aria-expanded") === "true";

      productsToggle.setAttribute("aria-expanded", String(!isExpanded));
      categoriesMenu.hidden = isExpanded;
    },
    { signal },
  );

  menuPanel.addEventListener(
    "click",
    (event) => {
      if (event.target.closest("a[href]")) {
        closeMobileMenu();
      }
    },
    { signal },
  );

  document.addEventListener(
    "click",
    (event) => {
      if (
        isMobileMenuOpen() &&
        !menuPanel.contains(event.target) &&
        !menuToggle.contains(event.target)
      ) {
        closeMobileMenu();
      }
    },
    { signal },
  );

  document.addEventListener("keydown", handleMobileMenuKeydown, { signal });

  window.addEventListener(
    "resize",
    () => {
      if (
        isMobileMenuOpen() &&
        !window.matchMedia("(max-width: 768px)").matches
      ) {
        closeMobileMenu({ restoreFocus: false });
      }
    },
    { signal },
  );
}







/* =====================================================
   INICIALIZAR BUSCADOR
===================================================== */

function initHeaderSearch() {
  const searchContainer = document.getElementById("header-search");
  const searchForm = document.getElementById("header-search-form");
  const searchInput = document.getElementById("header-search-input");
  const searchResults = document.getElementById("header-search-results");

  if (!searchContainer || !searchForm || !searchInput || !searchResults) {
    console.error("No se encontraron los elementos del buscador.");
    return;
  }

  headerSearchAbortController?.abort();
  headerSearchAbortController = new AbortController();

  const { signal } = headerSearchAbortController;

  let activeResultIndex = -1;
  let visibleProducts = [];

  /* ===================================================
     ABRIR RESULTADOS
  =================================================== */

  function openResults() {
    searchResults.hidden = false;
    searchInput.setAttribute("aria-expanded", "true");
  }

  /* ===================================================
     CERRAR RESULTADOS
  =================================================== */

  function closeResults() {
    searchResults.hidden = true;
    searchInput.setAttribute("aria-expanded", "false");

    activeResultIndex = -1;
    updateActiveResult();
  }

  /* ===================================================
     OBTENER RESULTADOS VISIBLES
  =================================================== */

  function getResultElements() {
    return [...searchResults.querySelectorAll(".search-result")];
  }

  /* ===================================================
     ACTUALIZAR RESULTADO ACTIVO
  =================================================== */

  function updateActiveResult() {
    const resultElements = getResultElements();

    resultElements.forEach((resultElement, index) => {
      const isActive = index === activeResultIndex;

      resultElement.classList.toggle("is-active", isActive);

      resultElement.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    const activeElement = resultElements[activeResultIndex];

    if (activeElement) {
      activeElement.scrollIntoView({
        block: "nearest",
      });
    }
  }

  /* ===================================================
     MOSTRAR RESULTADOS
  =================================================== */

  function renderResults(query) {
    const cleanQuery = query.trim();

    searchResults.replaceChildren();

    activeResultIndex = -1;
    visibleProducts = [];

    if (!cleanQuery) {
      closeResults();
      return;
    }

    visibleProducts = searchProducts(cleanQuery);

    if (visibleProducts.length === 0) {
      searchResults.append(createEmptyMessage(cleanQuery));

      openResults();
      return;
    }

    const fragment = document.createDocumentFragment();

    visibleProducts.forEach((product, index) => {
      fragment.append(createSearchResult(product, cleanQuery, index));
    });

    searchResults.append(fragment);

    openResults();
  }

  /* ===================================================
     BUSCAR MIENTRAS SE ESCRIBE
  =================================================== */

  searchInput.addEventListener(
    "input",
    () => {
      renderResults(searchInput.value);
    },
    { signal },
  );

  /* ===================================================
     MOSTRAR RESULTADOS AL ENFOCAR
  =================================================== */

  searchInput.addEventListener(
    "focus",
    () => {
      if (searchInput.value.trim()) {
        renderResults(searchInput.value);
      }
    },
    { signal },
  );

  /* ===================================================
     NAVEGACIÓN CON TECLADO
  =================================================== */

  searchInput.addEventListener(
    "keydown",
    (event) => {
      const resultElements = getResultElements();

      if (event.key === "Escape") {
        closeResults();
        searchInput.blur();
        return;
      }

      if (resultElements.length === 0) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();

        activeResultIndex =
          activeResultIndex < resultElements.length - 1
            ? activeResultIndex + 1
            : 0;

        updateActiveResult();
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();

        activeResultIndex =
          activeResultIndex > 0
            ? activeResultIndex - 1
            : resultElements.length - 1;

        updateActiveResult();
        return;
      }

    },
    { signal },
  );

  /* ===================================================
     ENVIAR FORMULARIO
  =================================================== */

  searchForm.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();

      const query = searchInput.value.trim();

      if (!query) {
        searchInput.focus();
        return;
      }

      trackSearch(query, searchProducts(query, false).length, "header");

      window.location.href = createCatalogUrl({
        search: query,
      });
    },
    { signal },
  );

/* ===================================================
     CERRAR AL HACER CLIC FUERA
  =================================================== */

  document.addEventListener(
    "click",
    (event) => {
      if (!searchContainer.contains(event.target)) {
        closeResults();
      }
    },
    { signal },
  );
}

/* =====================================================
   BUSCAR PRODUCTOS
===================================================== */

function searchProducts(query, limitResults = true) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return [];
  }

  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

  const results = products
    .filter((product) => {
      const productText = getProductSearchText(product);

      return queryWords.every((word) => {
        return productText.includes(word);
      });
    })
    .sort((productA, productB) => {
      const nameA = normalizeSearchText(productA.name);
      const nameB = normalizeSearchText(productB.name);

      const collectionA = normalizeSearchText(productA.collection);
      const collectionB = normalizeSearchText(productB.collection);

      const nameStartsA = nameA.startsWith(normalizedQuery);
      const nameStartsB = nameB.startsWith(normalizedQuery);

      if (nameStartsA && !nameStartsB) {
        return -1;
      }

      if (!nameStartsA && nameStartsB) {
        return 1;
      }

      const nameIncludesA = nameA.includes(normalizedQuery);
      const nameIncludesB = nameB.includes(normalizedQuery);

      if (nameIncludesA && !nameIncludesB) {
        return -1;
      }

      if (!nameIncludesA && nameIncludesB) {
        return 1;
      }

      const collectionStartsA = collectionA.startsWith(normalizedQuery);
      const collectionStartsB = collectionB.startsWith(normalizedQuery);

      if (collectionStartsA && !collectionStartsB) {
        return -1;
      }

      if (!collectionStartsA && collectionStartsB) {
        return 1;
      }

      return nameA.localeCompare(nameB, "es");
    });

  return limitResults ? results.slice(0, MAX_RESULTS) : results;
}

/* =====================================================
   TEXTO UTILIZADO PARA BUSCAR
===================================================== */

function createSearchResult(product, searchTerm = "", index = 0) {
  const resultLink = document.createElement("a");

  resultLink.className = "search-result";
  resultLink.href = createProductUrl(product);

  resultLink.setAttribute("role", "option");
  resultLink.setAttribute("aria-selected", "false");
  resultLink.addEventListener("click", () => {
    trackSelectItem(product, {
      listId: "header_search_results",
      listName: "Resultados del buscador",
      index: index + 1,
      searchTerm,
    });
  });

  /* IMAGEN */

  const image = document.createElement("img");

  image.className = "search-result-image";
  image.src = getPrimaryProductImage(product);
  image.alt = product.name || "Producto";
  image.width = 52;
  image.height = 52;
  image.loading = "lazy";

  image.addEventListener("error", () => {
    image.style.display = "none";
  });

  /* CONTENIDO */

  const content = document.createElement("span");

  content.className = "search-result-content";

  const productName = document.createElement("strong");

  productName.className = "search-result-name";
  productName.textContent = product.name || "Producto sin nombre";

  const productMeta = document.createElement("span");

  productMeta.className = "search-result-meta";

  const metaValues = [product.collection, product.presentation].filter(Boolean);

  productMeta.textContent = metaValues.join(" · ");

  /* PRECIO */

  const productPrice = document.createElement("strong");

  productPrice.className = "search-result-price";
  productPrice.textContent = formatPrice(product.price);

  content.append(productName);

  if (metaValues.length > 0) {
    content.append(productMeta);
  }

  resultLink.append(image, content, productPrice);

  return resultLink;
}

/* =====================================================
   MENSAJE SIN RESULTADOS
===================================================== */

function createEmptyMessage(query) {
  const emptyMessage = document.createElement("div");

  emptyMessage.className = "search-empty";

  const title = document.createElement("strong");

  title.className = "search-empty-title";
  title.textContent = "No encontramos productos";

  const text = document.createElement("span");

  text.className = "search-empty-text";
  text.textContent = `No existen coincidencias para “${query}”.`;

  emptyMessage.append(title, text);

  return emptyMessage;
}

/* =====================================================
   FORMATEAR PRECIO
===================================================== */

function formatPrice(price) {
  const numericPrice = Number(price);

  if (!Number.isFinite(numericPrice)) {
    return "S/ 0.00";
  }

  return priceFormatter.format(numericPrice);
}

