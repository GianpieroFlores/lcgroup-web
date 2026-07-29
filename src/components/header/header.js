import "./header.css";
import products from "../../data/products.json";

/* =====================================================
   CONFIGURACIÓN DEL BUSCADOR
===================================================== */

const MAX_RESULTS = 6;

const PRODUCT_PAGE_URL = "/catalogo/producto/";
const CATALOG_PAGE_URL = "/catalogo/";

const priceFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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
    const response = await fetch("/src/components/header/header.html");

    if (!response.ok) {
      throw new Error(
        `No se pudo cargar el header. Código: ${response.status}`,
      );
    }

    const html = await response.text();

    headerContainer.innerHTML = html;
    await loadCategories(); 


    initHeaderSearch();
  } catch (error) {
    console.error("Error al cargar el header:", error);
  }
}

/* ==========================================
   CARGAR CATEGORÍAS
========================================== */


async function loadCategories() {
  const menu = document.getElementById(
    "header-categories-menu",
  );


  if (!menu) {
    return;
  }


  const response = await fetch(
    "/src/data/products.json",
  );


  const products = await response.json();


  const categories = [
    ...new Set(
      products.map((product) => product.category),
    ),
  ].sort();


  menu.innerHTML = `
    <li>
      <a href="/catalogo/">
        Todos los productos
      </a>
    </li>
  `;


  categories.forEach((category) => {
    menu.insertAdjacentHTML(
      "beforeend",
      `
        <li>
          <a href="/catalogo/?categoria=${category}">
            ${formatCategory(category)}
          </a>
        </li>
      `,
    );
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
      fragment.append(createSearchResult(product, index));
    });

    searchResults.append(fragment);

    openResults();
  }

  /* ===================================================
     BUSCAR MIENTRAS SE ESCRIBE
  =================================================== */

  searchInput.addEventListener("input", () => {
    renderResults(searchInput.value);
  });

  /* ===================================================
     MOSTRAR RESULTADOS AL ENFOCAR
  =================================================== */

  searchInput.addEventListener("focus", () => {
    if (searchInput.value.trim()) {
      renderResults(searchInput.value);
    }
  });

  /* ===================================================
     NAVEGACIÓN CON TECLADO
  =================================================== */

  searchInput.addEventListener("keydown", (event) => {
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

    if (event.key === "Enter" && activeResultIndex >= 0) {
      event.preventDefault();

      const selectedResult = resultElements[activeResultIndex];

      if (selectedResult) {
        selectedResult.click();
      }
    }
  });

  /* ===================================================
     ENVIAR FORMULARIO
  =================================================== */

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const query = searchInput.value.trim();
    const resultElements = getResultElements();

    if (!query) {
      searchInput.focus();
      return;
    }

    /*
     * Si se seleccionó un producto usando las flechas,
     * se abre dicho producto.
     */
    if (activeResultIndex >= 0 && resultElements[activeResultIndex]) {
      resultElements[activeResultIndex].click();
      return;
    }

    /*
     * Si solo existe un resultado, se abre directamente.
     */
    if (visibleProducts.length === 1) {
      goToProduct(visibleProducts[0].id);
      return;
    }

    /*
     * Si existen varios resultados, se dirige al catálogo
     * con el texto buscado.
     */
    window.location.href = `${CATALOG_PAGE_URL}?search=${encodeURIComponent(query)}`;
  });

  /* ===================================================
     SELECCIÓN CON EL MOUSE
  =================================================== */

  searchResults.addEventListener("mouseover", (event) => {
    const resultElement = event.target.closest(".search-result");

    if (!resultElement) {
      return;
    }

    activeResultIndex = Number(resultElement.dataset.resultIndex);

    updateActiveResult();
  });

  /* ===================================================
     CERRAR AL HACER CLIC FUERA
  =================================================== */

  document.addEventListener("click", (event) => {
    if (!searchContainer.contains(event.target)) {
      closeResults();
    }
  });
}

/* =====================================================
   BUSCAR PRODUCTOS
===================================================== */

function searchProducts(query) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return [];
  }

  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

  return products
    .filter((product) => {
      const productText = getProductSearchText(product);

      return queryWords.every((word) => {
        return productText.includes(word);
      });
    })
    .sort((productA, productB) => {
      const nameA = normalizeText(productA.name);
      const nameB = normalizeText(productB.name);

      const brandA = normalizeText(productA.brand);
      const brandB = normalizeText(productB.brand);

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

      const brandStartsA = brandA.startsWith(normalizedQuery);
      const brandStartsB = brandB.startsWith(normalizedQuery);

      if (brandStartsA && !brandStartsB) {
        return -1;
      }

      if (!brandStartsA && brandStartsB) {
        return 1;
      }

      return nameA.localeCompare(nameB, "es");
    })
    .slice(0, MAX_RESULTS);
}

/* =====================================================
   TEXTO UTILIZADO PARA BUSCAR
===================================================== */

function getProductSearchText(product) {
  return normalizeText(
    [product.name, product.brand, product.sku].filter(Boolean).join(" "),
  );
}

/* =====================================================
   CREAR RESULTADO DE PRODUCTO
===================================================== */

function createSearchResult(product, index) {
  const resultLink = document.createElement("a");

  resultLink.className = "search-result";
  resultLink.href = `${PRODUCT_PAGE_URL}?id=${encodeURIComponent(product.id)}`;

  resultLink.dataset.resultIndex = String(index);

  resultLink.setAttribute("role", "option");
  resultLink.setAttribute("aria-selected", "false");

  /* IMAGEN */

  const image = document.createElement("img");

  image.className = "search-result-image";
  image.src =
  product.gallery?.[0]?.image ||
  "/src/assets/images/product-placeholder.png";
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

  const metaValues = [product.brand, product.variant].filter(Boolean);

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
   NORMALIZAR TEXTO
===================================================== */

function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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

/* =====================================================
   IR AL PRODUCTO
===================================================== */

function goToProduct(productId) {
  window.location.href = `${PRODUCT_PAGE_URL}?id=${encodeURIComponent(productId)}`;
}
