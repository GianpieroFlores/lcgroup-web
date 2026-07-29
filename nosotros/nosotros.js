import "./nosotros.css"
import { escapeHTML } from "../src/utils/escape.js";
import { createCatalogUrl } from "../src/utils/urls.js";

/* =====================================================
   PÁGINA NOSOTROS
===================================================== */

const PRODUCTS_URL = "/src/data/products.json";

/* =====================================================
   INICIALIZACIÓN
===================================================== */

document.addEventListener("DOMContentLoaded", initializeAboutPage);

async function initializeAboutPage() {
  try {
    const products = await loadProducts();

    renderCategories(products);
    renderCollections(products);
  } catch (error) {
    console.error("No se pudo cargar la página Nosotros:", error);

    showCategoriesError();
    showCollectionsError();
  }
}

/* =====================================================
   CARGAR PRODUCTOS
===================================================== */

async function loadProducts() {
  const response = await fetch(PRODUCTS_URL);

  if (!response.ok) {
    throw new Error(
      `Error al cargar products.json: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new TypeError("El contenido de products.json debe ser un arreglo.");
  }

  return data.filter(isValidProduct);
}

function isValidProduct(product) {
  return (
    product &&
    typeof product === "object" &&
    product.name &&
    product.category
  );
}

/* =====================================================
   CATEGORÍAS
===================================================== */

function renderCategories(products) {
  const categoriesContainer = document.getElementById(
    "about-categories-grid",
  );

  if (!categoriesContainer) {
    return;
  }

  const categories = getUniqueCategories(products);

  if (categories.length === 0) {
    categoriesContainer.innerHTML = `
      <p class="about-empty-message">
        No hay categorías disponibles actualmente.
      </p>
    `;

    return;
  }

  categoriesContainer.innerHTML = categories
    .map(createCategoryCard)
    .join("");
}

function getUniqueCategories(products) {
  const categoryMap = new Map();

  products.forEach((product) => {
    const category = normalizeText(product.category);

    if (!category) {
      return;
    }

    const categoryKey = category.toLocaleLowerCase("es");

    if (!categoryMap.has(categoryKey)) {
      categoryMap.set(categoryKey, {
        name: category,
        image: product.image || "",
        productCount: 1,
      });

      return;
    }

    const existingCategory = categoryMap.get(categoryKey);

    existingCategory.productCount += 1;

    /*
     * Si el primer producto no tenía imagen,
     * se utiliza la imagen de otro producto de la categoría.
     */
    if (!existingCategory.image && product.image) {
      existingCategory.image = product.image;
    }
  });

  return [...categoryMap.values()].sort((categoryA, categoryB) =>
    categoryA.name.localeCompare(categoryB.name, "es", {
      sensitivity: "base",
    }),
  );
}

function createCategoryCard(category) {
  const categoryName = formatDisplayName(category.name);
  const categoryUrl = createCatalogUrl({
    categoria: category.name,
  });
  const categoryImage =
    category.image || "/src/assets/images/product-placeholder.png";

  return `
    <article class="about-category-card">
      <a
        href="${categoryUrl}"
        aria-label="Explorar categoría ${escapeHTML(categoryName)}"
      >
        <div class="about-category-card__image">
          <img
            src="${escapeHTML(categoryImage)}"
            alt="${escapeHTML(categoryName)}"
            loading="lazy"
            width="600"
            height="700"
          />
        </div>

        <div class="about-category-card__content">
          <h3>${escapeHTML(categoryName)}</h3>

          <p>
            ${escapeHTML(getCategoryDescription(category.name))}
          </p>

          <span>
            Explorar categoría
          </span>
        </div>
      </a>
    </article>
  `;
}

function getCategoryDescription(category) {
  const normalizedCategory = normalizeForComparison(category);

  const descriptions = {
    copa: "Copas diseñadas para realzar la presentación y las características de cada bebida.",
    copas:
      "Copas diseñadas para realzar la presentación y las características de cada bebida.",

    vaso: "Vasos Spiegelau que combinan diseño, comodidad y funcionalidad para diferentes bebidas.",
    vasos:
      "Vasos Spiegelau que combinan diseño, comodidad y funcionalidad para diferentes bebidas.",

    decantador:
      "Decantadores creados para mejorar la presentación y la experiencia de servicio del vino.",
    decantadores:
      "Decantadores creados para mejorar la presentación y la experiencia de servicio del vino.",

    jarra: "Jarras funcionales y elegantes para servir diferentes bebidas en el hogar o en espacios profesionales.",
    jarras:
      "Jarras funcionales y elegantes para servir diferentes bebidas en el hogar o en espacios profesionales.",

    taza: "Tazas con diseños adecuados para disfrutar bebidas calientes con estilo y comodidad.",
    tazas:
      "Tazas con diseños adecuados para disfrutar bebidas calientes con estilo y comodidad.",

    kit: "Conjuntos de cristalería preparados para diferentes bebidas, ocasiones y estilos de servicio.",
    kits: "Conjuntos de cristalería preparados para diferentes bebidas, ocasiones y estilos de servicio.",

    accesorio:
      "Complementos diseñados para mejorar la presentación, preparación y servicio de cada bebida.",
    accesorios:
      "Complementos diseñados para mejorar la presentación, preparación y servicio de cada bebida.",
  };

  return (
    descriptions[normalizedCategory] ||
    `Descubre la selección de ${category.toLocaleLowerCase("es")} disponible en nuestro catálogo Spiegelau.`
  );
}

/* =====================================================
   COLECCIONES
===================================================== */

function renderCollections(products) {
  const collectionsContainer = document.getElementById(
    "about-collections-list",
  );

  if (!collectionsContainer) {
    return;
  }

  const collections = getUniqueCollections(products).slice(0, 6);

  if (collections.length === 0) {
    collectionsContainer.innerHTML = `
      <p class="about-empty-message">
        No hay colecciones disponibles actualmente.
      </p>
    `;

    return;
  }

  collectionsContainer.innerHTML = collections
    .map(createCollectionCard)
    .join("");
}

function getUniqueCollections(products) {
  const collectionMap = new Map();

  products.forEach((product) => {
    const collection = normalizeText(product.brand);

    if (!collection) {
      return;
    }

    const collectionKey = collection.toLocaleLowerCase("es");

    if (!collectionMap.has(collectionKey)) {
      collectionMap.set(collectionKey, {
        name: collection,
        productCount: 1,
      });

      return;
    }

    collectionMap.get(collectionKey).productCount += 1;
  });

  return [...collectionMap.values()].sort((collectionA, collectionB) =>
    collectionA.name.localeCompare(collectionB.name, "es", {
      sensitivity: "base",
    }),
  );
}

function createCollectionCard(collection) {
  const collectionName = formatDisplayName(collection.name);
  const collectionUrl = createCatalogUrl({
    marca: collection.name,
  });

  return `
    <a
      href="${collectionUrl}"
      class="about-brand"
      aria-label="Explorar colección ${escapeHTML(collectionName)}"
    >
      <span>${escapeHTML(collectionName)}</span>
    </a>
  `;
}

/* =====================================================
   MENSAJES DE ERROR
===================================================== */

function showCategoriesError() {
  const categoriesContainer = document.getElementById(
    "about-categories-grid",
  );

  if (!categoriesContainer) {
    return;
  }

  categoriesContainer.innerHTML = `
    <p class="about-empty-message">
      No fue posible cargar las categorías en este momento.
    </p>
  `;
}

function showCollectionsError() {
  const collectionsContainer = document.getElementById(
    "about-collections-list",
  );

  if (!collectionsContainer) {
    return;
  }

  collectionsContainer.innerHTML = `
    <p class="about-empty-message">
      No fue posible cargar las colecciones en este momento.
    </p>
  `;
}

/* =====================================================
   UTILIDADES
===================================================== */

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ");
}

function normalizeForComparison(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

function formatDisplayName(value) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return "";
  }

  return normalizedValue
    .split(" ")
    .map((word) => {
      /*
       * Conserva siglas o palabras escritas completamente
       * en mayúsculas.
       */
      if (word.length > 1 && word === word.toUpperCase()) {
        return word;
      }

      return (
        word.charAt(0).toLocaleUpperCase("es") +
        word.slice(1)
      );
    })
    .join(" ");
}
