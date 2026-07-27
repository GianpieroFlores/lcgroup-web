import "./index-prueba.css";
import { createProductCard } from "./components/product-card/product-card.js";
/* =====================================================
   PÁGINA DE INICIO
===================================================== */

const HOME_PRODUCTS_URL = "/src/data/products.json";

/* =====================================================
   ESTADO GENERAL
===================================================== */

const homeState = {
  products: [],
  featuredProducts: [],
  activeProductIndex: 0,
  carouselReady: false,
  carouselMoving: false,
  carouselMovementTimer: null,
  resizeTimer: null,
};

/* =====================================================
   ELEMENTOS DEL DOM
===================================================== */

const homeElements = {
  categoriesGrid: null,
  collectionsGrid: null,

  featuredCarousel: null,
  featuredViewport: null,
  featuredTrack: null,
  featuredPreviousButton: null,
  featuredNextButton: null,
  featuredPagination: null,
  featuredCurrent: null,
  featuredTotal: null,
};

/* =====================================================
   INICIALIZACIÓN
===================================================== */

document.addEventListener("DOMContentLoaded", initHomePage);

async function initHomePage() {
  getHomeElements();

  if (!isHomePage()) {
    return;
  }

  showInitialLoadingStates();

  try {
    const products = await loadProducts();

    homeState.products = products;

    renderHomeCategories(products);
    renderHomeCollections(products);

    await renderFeaturedProducts(products);

    initFeaturedCarousel();
  } catch (error) {
    console.error("Error al inicializar la página de inicio:", error);

    showHomeLoadingError();
  }
}

/* =====================================================
   OBTENER ELEMENTOS
===================================================== */

function getHomeElements() {
  homeElements.categoriesGrid = document.querySelector("#home-categories-grid");

  homeElements.collectionsGrid = document.querySelector(
    "#home-collections-grid",
  );

  homeElements.featuredCarousel = document.querySelector(
    "#home-featured-carousel",
  );

  homeElements.featuredViewport = document.querySelector(
    ".home-product-carousel__viewport",
  );

  homeElements.featuredTrack = document.querySelector(
    "#home-featured-products-track",
  );

  homeElements.featuredPreviousButton = document.querySelector(
    "#home-featured-prev",
  );

  homeElements.featuredNextButton = document.querySelector(
    "#home-featured-next",
  );

  homeElements.featuredPagination = document.querySelector(
    "#home-featured-pagination",
  );

  homeElements.featuredCurrent = document.querySelector(
    "#home-featured-current",
  );

  homeElements.featuredTotal = document.querySelector("#home-featured-total");
}

/* =====================================================
   VERIFICAR PÁGINA
===================================================== */

function isHomePage() {
  return Boolean(
    homeElements.categoriesGrid ||
    homeElements.collectionsGrid ||
    homeElements.featuredTrack,
  );
}

/* =====================================================
   CARGAR PRODUCTOS
===================================================== */

async function loadProducts() {
  const response = await fetch(HOME_PRODUCTS_URL);

  if (!response.ok) {
    throw new Error(
      `No se pudo cargar products.json. Código: ${response.status}`,
    );
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new TypeError(
      "El archivo products.json debe contener un arreglo de productos.",
    );
  }

  return data.filter(isValidProduct);
}

/* =====================================================
   VALIDACIÓN DE PRODUCTOS
===================================================== */

function isValidProduct(product) {
  if (!product || typeof product !== "object") {
    return false;
  }

  const hasIdentifier =
    product.id !== undefined &&
    product.id !== null &&
    String(product.id).trim() !== "";

  const hasName =
    typeof product.name === "string" && product.name.trim() !== "";

  return hasIdentifier && hasName;
}

/* =====================================================
   ESTADOS DE CARGA
===================================================== */

function showInitialLoadingStates() {
  if (homeElements.categoriesGrid) {
    homeElements.categoriesGrid.innerHTML = createStatusMarkup(
      "home-loading",
      "Cargando categorías...",
    );
  }

  if (homeElements.collectionsGrid) {
    homeElements.collectionsGrid.innerHTML = createStatusMarkup(
      "home-loading",
      "Cargando colecciones...",
    );
  }

  if (homeElements.featuredTrack) {
    homeElements.featuredTrack.innerHTML = createStatusMarkup(
      "home-loading",
      "Cargando productos destacados...",
    );
  }
}

/* =====================================================
   ERROR DE CARGA GENERAL
===================================================== */

function showHomeLoadingError() {
  const message =
    "No fue posible cargar los productos. Revisa la ruta de products.json.";

  if (homeElements.categoriesGrid) {
    homeElements.categoriesGrid.innerHTML = createStatusMarkup(
      "home-error",
      message,
    );
  }

  if (homeElements.collectionsGrid) {
    homeElements.collectionsGrid.innerHTML = createStatusMarkup(
      "home-error",
      message,
    );
  }

  if (homeElements.featuredTrack) {
    homeElements.featuredTrack.innerHTML = createStatusMarkup(
      "home-error",
      message,
    );
  }

  hideFeaturedCarouselControls();
}

/* =====================================================
   CREAR ESTADO
===================================================== */

function createStatusMarkup(className, message) {
  return `
    <div class="${className}">
      <p>${escapeHTML(message)}</p>
    </div>
  `;
}

/* =====================================================
   CATEGORÍAS
===================================================== */

function renderHomeCategories(products) {
  if (!homeElements.categoriesGrid) {
    return;
  }

  const categories = getUniqueCategories(products);

  if (categories.length === 0) {
    homeElements.categoriesGrid.innerHTML = createStatusMarkup(
      "home-empty",
      "No hay categorías disponibles por el momento.",
    );

    return;
  }

  homeElements.categoriesGrid.innerHTML = categories
    .map((category, index) => {
      return createCategoryCard(category, index);
    })
    .join("");
}

/* =====================================================
   OBTENER CATEGORÍAS ÚNICAS
===================================================== */

function getUniqueCategories(products) {
  const categoriesMap = new Map();

  products.forEach((product) => {
    const categoryName = normalizeText(product.category);

    if (!categoryName) {
      return;
    }

    const categoryKey = normalizeKey(categoryName);

    if (!categoriesMap.has(categoryKey)) {
      categoriesMap.set(categoryKey, {
        name: categoryName,
        slug: slugify(categoryName),
        image: getProductImage(product),
        productCount: 1,
      });

      return;
    }

    const existingCategory = categoriesMap.get(categoryKey);

    existingCategory.productCount += 1;

    if (!existingCategory.image && getProductImage(product)) {
      existingCategory.image = getProductImage(product);
    }
  });

  return Array.from(categoriesMap.values()).sort((a, b) => {
    return a.name.localeCompare(b.name, "es", {
      sensitivity: "base",
    });
  });
}

/* =====================================================
   CREAR TARJETA DE CATEGORÍA
===================================================== */

function createCategoryCard(category, index) {
  const categoryNumber = formatCounter(index + 1);
  const categoryName = formatDisplayText(category.name);
  const categoryURL = createCatalogURL({
    categoria: category.slug,
  });

  const imageMarkup = createImageMarkup({
    src: category.image,
    alt: `Categoría ${categoryName}`,
    width: 600,
    height: 750,
    loading: "lazy",
  });

  return `
    <article class="home-category-card">
      <a href="${escapeAttribute(categoryURL)}">
        <div class="home-category-card__media">
          ${imageMarkup}
        </div>

        <div class="home-category-card__overlay"></div>

        <div class="home-category-card__content">
          <span class="home-category-card__number">
            ${categoryNumber}
          </span>

          <h3>
            ${escapeHTML(categoryName)}
          </h3>

          <span class="home-category-card__action">
            Ver productos

            <span
              class="material-symbols-outlined"
              aria-hidden="true"
            >
              arrow_forward
            </span>
          </span>
        </div>
      </a>
    </article>
  `;
}

/* =====================================================
   COLECCIONES
===================================================== */

function renderHomeCollections(products) {
  if (!homeElements.collectionsGrid) {
    return;
  }

  const collections = getUniqueCollections(products).slice(0, 6);

  if (collections.length === 0) {
    homeElements.collectionsGrid.innerHTML = createStatusMarkup(
      "home-empty",
      "No hay colecciones disponibles por el momento.",
    );

    return;
  }

  homeElements.collectionsGrid.innerHTML = collections
    .map((collection) => {
      return createCollectionCard(collection);
    })
    .join("");
}

/* =====================================================
   OBTENER COLECCIONES ÚNICAS
===================================================== */

function getUniqueCollections(products) {
  const collectionsMap = new Map();

  products.forEach((product) => {
    const brandName = normalizeText(product.brand);

    if (!brandName) {
      return;
    }

    const brandKey = normalizeKey(brandName);

    if (!collectionsMap.has(brandKey)) {
      collectionsMap.set(brandKey, {
        name: brandName,
        image: getProductImage(product),
        productCount: 1,
      });

      return;
    }

    const existingCollection = collectionsMap.get(brandKey);

    existingCollection.productCount += 1;

    if (!existingCollection.image && getProductImage(product)) {
      existingCollection.image = getProductImage(product);
    }
  });

  return Array.from(collectionsMap.values()).sort((a, b) => {
    return a.name.localeCompare(b.name, "es", {
      sensitivity: "base",
    });
  });
}

/* =====================================================
   CREAR TARJETA DE COLECCIÓN
===================================================== */

function createCollectionCard(collection) {
  const collectionName = formatDisplayText(collection.name);

  const collectionURL = createCatalogURL({
    marca: collection.name,
  });

  const imageMarkup = createImageMarkup({
    src: collection.image,
    alt: `Colección ${collectionName}`,
    width: 800,
    height: 1000,
    loading: "lazy",
  });

  return `
    <article class="home-collection-card">
      <a href="${escapeAttribute(collectionURL)}">
        <div class="home-collection-card__media">
          ${imageMarkup}
        </div>

        <div class="home-collection-card__overlay"></div>

        <div class="home-collection-card__content">
          <span>
            Colección
          </span>

          <h3>
            ${escapeHTML(collectionName)}
          </h3>

          <strong>
            Explorar colección

            <span
              class="material-symbols-outlined"
              aria-hidden="true"
            >
              arrow_forward
            </span>
          </strong>
        </div>
      </a>
    </article>
  `;
}

/* =====================================================
   PRODUCTOS DESTACADOS
===================================================== */

async function renderFeaturedProducts(products) {
  if (!homeElements.featuredTrack) {
    return;
  }

  /*
   * Toma automáticamente todos los productos
   * que tengan featured: true en products.json.
   */
  homeState.featuredProducts = products.filter((product) => {
    return product.featured === true;
  });

  homeState.activeProductIndex = 0;
  homeState.carouselMoving = false;

  if (homeState.featuredProducts.length === 0) {
    homeElements.featuredTrack.innerHTML = createStatusMarkup(
      "home-empty",
      "No hay productos destacados disponibles por el momento.",
    );

    updateFeaturedCounter();
    hideFeaturedCarouselControls();

    return;
  }

  /*
   * Se genera cada tarjeta usando el componente real
   * de product-card.
   */
  const productCards = await Promise.all(
    homeState.featuredProducts.map(async (product, index) => {
      const productCardHTML = await createProductCard(product);

      return `
        <div
          class="home-product-slide ${index === 0 ? "is-active" : ""}"
          data-carousel-slide
          data-real-index="${index}"
        >
          ${productCardHTML}
        </div>
      `;
    }),
  );

  homeElements.featuredTrack.innerHTML = productCards.join("");

  prepareCircularCarouselStructure();
  renderFeaturedPagination();
  updateFeaturedCounter();
  showFeaturedCarouselControls();
}

/* =====================================================
   PREPARAR ESTRUCTURA DEL CARRUSEL CIRCULAR
===================================================== */

function prepareCircularCarouselStructure() {
  const viewport = homeElements.featuredViewport;

  const track = homeElements.featuredTrack;

  if (!viewport || !track) {
    return;
  }
  track.style.removeProperty("transform");
  track.style.removeProperty("transition");

  track.style.position = "relative";
  track.style.width = "100%";
  track.style.margin = "0";
  track.style.padding = "0";

  viewport.style.position = "relative";
  viewport.style.overflow = "hidden";

  const slides = getFeaturedSlides();

  slides.forEach((slide) => {
    slide.style.position = "absolute";
    slide.style.top = "0";
    slide.style.left = "50%";
    slide.style.margin = "0";

    slide.style.transition = [
      "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)",
      "opacity 420ms ease",
      "filter 600ms cubic-bezier(0.22, 1, 0.36, 1)",
    ].join(", ");

    slide.style.transformOrigin = "center center";
    slide.style.backfaceVisibility = "hidden";
    slide.style.willChange = "transform, opacity, filter";
  });

  updateCircularCarouselHeight();

  slides.forEach((slide) => {
    const image = slide.querySelector("img");

    if (!image || image.complete) {
      return;
    }

    image.addEventListener("load", updateCircularCarouselHeight, {
      once: true,
    });
  });
}

/* =====================================================
   INICIALIZAR CARRUSEL CIRCULAR
===================================================== */

function initFeaturedCarousel() {
  if (
    !homeElements.featuredCarousel ||
    !homeElements.featuredViewport ||
    !homeElements.featuredTrack
  ) {
    return;
  }

  if (homeState.featuredProducts.length === 0) {
    return;
  }

  if (!homeState.carouselReady) {
    homeElements.featuredPreviousButton?.addEventListener(
      "click",
      showPreviousFeaturedProduct,
    );

    homeElements.featuredNextButton?.addEventListener(
      "click",
      showNextFeaturedProduct,
    );

    homeElements.featuredPagination?.addEventListener(
      "click",
      handleFeaturedPaginationClick,
    );

    window.addEventListener("resize", handleFeaturedCarouselResize);

    homeState.carouselReady = true;
  }

  /*
   * Se esperan dos frames para asegurar que el navegador
   * haya calculado el tamaño de las tarjetas.
   */
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      updateCircularCarouselHeight();
      updateFeaturedCarousel(false);
    });
  });
}

/* =====================================================
   PRODUCTO ANTERIOR
===================================================== */

function showPreviousFeaturedProduct() {
  const totalProducts = homeState.featuredProducts.length;

  if (totalProducts <= 1 || homeState.carouselMoving) {
    return;
  }

  homeState.carouselMoving = true;

  homeState.activeProductIndex = circularModulo(
    homeState.activeProductIndex - 1,
    totalProducts,
  );

  updateFeaturedCarousel(true);
  releaseCarouselMovement();
}

/* =====================================================
   PRODUCTO SIGUIENTE
===================================================== */

function showNextFeaturedProduct() {
  const totalProducts = homeState.featuredProducts.length;

  if (totalProducts <= 1 || homeState.carouselMoving) {
    return;
  }

  homeState.carouselMoving = true;

  homeState.activeProductIndex = circularModulo(
    homeState.activeProductIndex + 1,
    totalProducts,
  );

  updateFeaturedCarousel(true);
  releaseCarouselMovement();
}

/* =====================================================
   LIBERAR MOVIMIENTO DEL CARRUSEL
===================================================== */

function releaseCarouselMovement() {
  window.clearTimeout(homeState.carouselMovementTimer);

  homeState.carouselMovementTimer = window.setTimeout(() => {
    homeState.carouselMoving = false;
  }, 620);
}

/* =====================================================
   IR A PRODUCTO MEDIANTE PAGINACIÓN
===================================================== */

function goToFeaturedProduct(index) {
  const parsedIndex = Number(index);

  const totalProducts = homeState.featuredProducts.length;

  if (
    !Number.isInteger(parsedIndex) ||
    parsedIndex < 0 ||
    parsedIndex >= totalProducts ||
    homeState.carouselMoving ||
    parsedIndex === homeState.activeProductIndex
  ) {
    return;
  }

  homeState.carouselMoving = true;
  homeState.activeProductIndex = parsedIndex;

  updateFeaturedCarousel(true);
  releaseCarouselMovement();
}

/* =====================================================
   EVENTO DE PAGINACIÓN
===================================================== */

function handleFeaturedPaginationClick(event) {
  const paginationButton = event.target.closest("[data-carousel-index]");

  if (!paginationButton) {
    return;
  }

  goToFeaturedProduct(paginationButton.dataset.carouselIndex);
}

/* =====================================================
   ACTUALIZAR CARRUSEL
===================================================== */

function updateFeaturedCarousel(animate = true) {
  const slides = getFeaturedSlides();

  const totalProducts = homeState.featuredProducts.length;

  if (slides.length === 0 || totalProducts === 0) {
    return;
  }

  const carouselMeasurements = getCarouselMeasurements(slides);

  slides.forEach((slide, slideIndex) => {
    const circularDistance = getCircularDistance(
      slideIndex,
      homeState.activeProductIndex,
      totalProducts,
    );

    positionFeaturedSlide(
      slide,
      circularDistance,
      carouselMeasurements,
      animate,
    );

    updateFeaturedSlideClasses(slide, circularDistance);
  });

  updateFeaturedPagination();
  updateFeaturedCounter();
  updateFeaturedButtons();
}

/* =====================================================
   OBTENER TARJETAS
===================================================== */

function getFeaturedSlides() {
  if (!homeElements.featuredTrack) {
    return [];
  }

  return Array.from(
    homeElements.featuredTrack.querySelectorAll("[data-carousel-slide]"),
  );
}

/* =====================================================
   CALCULAR DISTANCIA CIRCULAR
===================================================== */

function getCircularDistance(slideIndex, activeIndex, totalProducts) {
  if (totalProducts <= 1) {
    return 0;
  }

  /*
   * Distancia hacia adelante.
   *
   * Ejemplo:
   * activo 0, producto 5, total 6
   * forwardDistance = 5
   */
  const forwardDistance = circularModulo(
    slideIndex - activeIndex,
    totalProducts,
  );

  /*
   * Distancia hacia atrás.
   *
   * En el ejemplo anterior:
   * backwardDistance = -1
   *
   * Por eso el producto 6 aparece inmediatamente
   * a la izquierda del producto 1.
   */
  const backwardDistance = forwardDistance - totalProducts;

  if (Math.abs(backwardDistance) < Math.abs(forwardDistance)) {
    return backwardDistance;
  }

  /*
   * Cuando existe la misma distancia a ambos lados,
   * como puede ocurrir con cantidades pares,
   * se conserva la posición positiva.
   */
  return forwardDistance;
}

/* =====================================================
   MEDIDAS DEL CARRUSEL
===================================================== */

function getCarouselMeasurements(slides) {
  const viewportWidth =
    homeElements.featuredViewport?.clientWidth || window.innerWidth;

  const firstSlide = slides[0];

  const slideWidth = firstSlide?.offsetWidth || 360;

  let horizontalStep;
  let sideScale;
  let farScale;
  let sideRotation;
  let visibleDistance;

  /*
   * Escritorio grande.
   */
  if (viewportWidth >= 1200) {
    horizontalStep = slideWidth * 1;

    sideScale = 0.82;
    farScale = 0.68;
    sideRotation = 7;
    visibleDistance = 2;
  } else if (viewportWidth >= 768) {
    /*
     * Escritorio y tablet horizontal.
     */
    horizontalStep = Math.min(slideWidth * 0.72, viewportWidth * 0.31);

    sideScale = 0.8;
    farScale = 0.65;
    sideRotation = 6;
    visibleDistance = 2;
  } else {
    /*
     * Teléfonos.
     */
    horizontalStep = Math.min(slideWidth * 0.64, viewportWidth * 0.58);

    sideScale = 0.78;
    farScale = 0.62;
    sideRotation = 4;
    visibleDistance = 1;
  }

  return {
    viewportWidth,
    slideWidth,
    horizontalStep,
    sideScale,
    farScale,
    sideRotation,
    visibleDistance,
  };
}

/* =====================================================
   POSICIONAR TARJETA
===================================================== */

function positionFeaturedSlide(slide, distance, measurements, animate) {
  const absoluteDistance = Math.abs(distance);

  const isActive = distance === 0;

  const isVisible = absoluteDistance <= measurements.visibleDistance;

  let translateX = 0;
  let translateY = 0;
  let scale = 1;
  let rotateY = 0;
  let opacity = 1;
  let blur = 0;
  let zIndex = 1;

  if (isActive) {
    translateX = 0;
    translateY = 0;
    scale = 1;
    rotateY = 0;
    opacity = 1;
    blur = 0;
    zIndex = 100;
  } else if (absoluteDistance === 1) {
    translateX = distance * measurements.horizontalStep;

    translateY = 4;
    scale = measurements.sideScale;

    rotateY =
      distance > 0 ? -measurements.sideRotation : measurements.sideRotation;

    opacity = 0.76;
    blur = 0;
    zIndex = 90;
  } else if (absoluteDistance === 2) {
    translateX = distance * measurements.horizontalStep * 0.91;

    translateY = 8;
    scale = measurements.farScale;

    rotateY =
      distance > 0
        ? -measurements.sideRotation * 1.3
        : measurements.sideRotation * 1.3;

    opacity = 0.34;
    blur = 0.4;
    zIndex = 80;
  } else {
    const direction = distance < 0 ? -1 : 1;

    translateX = direction * measurements.horizontalStep * 2.5;

    translateY = 12;
    scale = measurements.farScale * 0.84;

    rotateY = direction * -measurements.sideRotation * 1.5;

    opacity = 0;
    blur = 1;
    zIndex = 1;
  }

  if (!animate) {
    slide.style.transition = "none";
  } else {
    slide.style.transition = [
      "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)",
      "opacity 420ms ease",
      "filter 600ms cubic-bezier(0.22, 1, 0.36, 1)",
    ].join(", ");
  }

  slide.style.transform = `
    translate(-50%, 0)
    translate3d(
      ${translateX}px,
      ${translateY}px,
      0
    )
    perspective(1200px)
    rotateY(${rotateY}deg)
    scale(${scale})
  `;

  slide.style.opacity = String(opacity);
  slide.style.filter = `blur(${blur}px)`;
  slide.style.zIndex = String(zIndex);

  slide.style.pointerEvents = isActive ? "auto" : "none";
  slide.style.visibility = opacity === 0 ? "hidden" : "visible";

  slide.setAttribute("aria-hidden", isActive ? "false" : "true");

  if (!animate) {
    /*
     * Aplicar inmediatamente la posición inicial.
     * Luego se vuelve a activar la transición.
     */
    void slide.offsetWidth;

    slide.style.transition = [
      "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)",
      "opacity 420ms ease",
      "filter 600ms cubic-bezier(0.22, 1, 0.36, 1)",
    ].join(", ");
  }
}

/* =====================================================
   ACTUALIZAR CLASES DE TARJETA
===================================================== */

function updateFeaturedSlideClasses(slide, distance) {
  slide.classList.toggle("is-active", distance === 0);

  slide.classList.toggle("is-previous", distance === -1);

  slide.classList.toggle("is-next", distance === 1);

  slide.classList.toggle("is-far-previous", distance === -2);

  slide.classList.toggle("is-far-next", distance === 2);

  slide.classList.toggle("is-hidden", Math.abs(distance) > 2);
}

/* =====================================================
   ALTURA DEL CARRUSEL
===================================================== */

function updateCircularCarouselHeight() {
  const slides = getFeaturedSlides();

  const track = homeElements.featuredTrack;
  const viewport = homeElements.featuredViewport;

  if (slides.length === 0 || !track || !viewport) {
    return;
  }

  const maximumSlideHeight = slides.reduce((maximumHeight, slide) => {
    return Math.max(maximumHeight, slide.offsetHeight);
  }, 0);

  if (maximumSlideHeight <= 0) {
    return;
  }
  const indicatorGap = 40;

  const finalHeight = maximumSlideHeight + indicatorGap;

  track.style.height = `${finalHeight}px`;

  viewport.style.height = `${finalHeight}px`;
  viewport.style.minHeight = `${finalHeight}px`;
}

/* =====================================================
   PAGINACIÓN
===================================================== */

function renderFeaturedPagination() {
  if (!homeElements.featuredPagination) {
    return;
  }

  const totalProducts = homeState.featuredProducts.length;

  if (totalProducts <= 1) {
    homeElements.featuredPagination.innerHTML = "";
    return;
  }

  homeElements.featuredPagination.innerHTML = homeState.featuredProducts
    .map((product, index) => {
      const productName =
        normalizeText(product.name) || `Producto ${index + 1}`;

      const activeClass =
        index === homeState.activeProductIndex ? "is-active" : "";

      return `
          <button
            type="button"
            class="${activeClass}"
            data-carousel-index="${index}"
            aria-label="Mostrar ${escapeAttribute(productName)}"
          ></button>
        `;
    })
    .join("");
}

/* =====================================================
   ACTUALIZAR PAGINACIÓN
===================================================== */

function updateFeaturedPagination() {
  if (!homeElements.featuredPagination) {
    return;
  }

  const buttons = Array.from(
    homeElements.featuredPagination.querySelectorAll("[data-carousel-index]"),
  );

  buttons.forEach((button, index) => {
    const isActive = index === homeState.activeProductIndex;

    button.classList.toggle("is-active", isActive);

    button.setAttribute("aria-current", isActive ? "true" : "false");
  });
}

/* =====================================================
   ACTUALIZAR CONTADOR
===================================================== */

function updateFeaturedCounter() {
  const totalProducts = homeState.featuredProducts.length;

  const currentProduct =
    totalProducts > 0 ? homeState.activeProductIndex + 1 : 0;

  if (homeElements.featuredCurrent) {
    homeElements.featuredCurrent.textContent = formatCounter(currentProduct);
  }

  if (homeElements.featuredTotal) {
    homeElements.featuredTotal.textContent = formatCounter(totalProducts);
  }
}

/* =====================================================
   ACTUALIZAR BOTONES
===================================================== */

function updateFeaturedButtons() {
  const totalProducts = homeState.featuredProducts.length;

  const shouldDisable = totalProducts <= 1;

  if (homeElements.featuredPreviousButton) {
    homeElements.featuredPreviousButton.disabled = shouldDisable;
  }

  if (homeElements.featuredNextButton) {
    homeElements.featuredNextButton.disabled = shouldDisable;
  }
}

/* =====================================================
   MOSTRAR CONTROLES
===================================================== */

function showFeaturedCarouselControls() {
  const totalProducts = homeState.featuredProducts.length;

  const shouldShow = totalProducts > 1;

  if (homeElements.featuredPreviousButton) {
    homeElements.featuredPreviousButton.hidden = !shouldShow;
  }

  if (homeElements.featuredNextButton) {
    homeElements.featuredNextButton.hidden = !shouldShow;
  }

  if (homeElements.featuredPagination) {
    homeElements.featuredPagination.hidden = !shouldShow;
  }

  updateFeaturedButtons();
}

/* =====================================================
   OCULTAR CONTROLES
===================================================== */

function hideFeaturedCarouselControls() {
  if (homeElements.featuredPreviousButton) {
    homeElements.featuredPreviousButton.hidden = true;
  }

  if (homeElements.featuredNextButton) {
    homeElements.featuredNextButton.hidden = true;
  }

  if (homeElements.featuredPagination) {
    homeElements.featuredPagination.hidden = true;
  }
}

/* =====================================================
   RESPONSIVE DEL CARRUSEL
===================================================== */

function handleFeaturedCarouselResize() {
  window.clearTimeout(homeState.resizeTimer);

  homeState.resizeTimer = window.setTimeout(() => {
    prepareCircularCarouselStructure();
    updateCircularCarouselHeight();
    updateFeaturedCarousel(false);
  }, 150);
}

/* =====================================================
   MÓDULO CIRCULAR POSITIVO
===================================================== */

function circularModulo(value, divisor) {
  if (divisor === 0) {
    return 0;
  }

  return ((value % divisor) + divisor) % divisor;
}

/* =====================================================
   CREAR URL DEL CATÁLOGO
===================================================== */

function createCatalogURL(filters = {}) {
  const url = new URL("/catalogo/", window.location.origin);

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || String(value).trim() === "") {
      return;
    }

    url.searchParams.set(key, String(value).trim());
  });

  return `${url.pathname}${url.search}`;
}

/* =====================================================
   CREAR URL DEL PRODUCTO
===================================================== */

function createProductURL(productId) {
  const url = new URL("/producto/", window.location.origin);

  url.searchParams.set("id", String(productId));

  return `${url.pathname}${url.search}`;
}

/* =====================================================
   OBTENER IMAGEN DEL PRODUCTO
===================================================== */

function getProductImage(product) {
  const possibleImages = [
    product.image,
    product.imageUrl,
    product.thumbnail,
    Array.isArray(product.images) ? product.images[0] : null,
  ];

  const validImage = possibleImages.find((image) => {
    return typeof image === "string" && image.trim() !== "";
  });

  return validImage
    ? validImage.trim()
    : "/src/assets/images/product-placeholder.png";
}

/* =====================================================
   CREAR IMAGEN
===================================================== */

function createImageMarkup({
  src,
  alt,
  width,
  height,
  loading = "lazy",
  fetchPriority = "auto",
}) {
  const safeSource =
    normalizeText(src) || "/src/assets/images/product-placeholder.png";

  const safeAlt = normalizeText(alt) || "Producto Spiegelau";

  return `
    <img
      src="${escapeAttribute(safeSource)}"
      alt="${escapeAttribute(safeAlt)}"
      width="${Number(width) || 600}"
      height="${Number(height) || 600}"
      loading="${escapeAttribute(loading)}"
      fetchpriority="${escapeAttribute(fetchPriority)}"
      decoding="async"
    />
  `;
}

/* =====================================================
   FORMATEAR PRECIO
===================================================== */

function formatPrice(price) {
  const numericPrice = parsePrice(price);

  if (numericPrice === null) {
    return "Consultar";
  }

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericPrice);
}

/* =====================================================
   CONVERTIR PRECIO A NÚMERO
===================================================== */

function parsePrice(price) {
  if (typeof price === "number") {
    return Number.isFinite(price) ? price : null;
  }

  if (typeof price !== "string") {
    return null;
  }

  const cleanedPrice = price
    .trim()
    .replace(/[^\d,.-]/g, "")
    .replace(",", ".");

  if (!cleanedPrice) {
    return null;
  }

  const numericPrice = Number(cleanedPrice);

  return Number.isFinite(numericPrice) ? numericPrice : null;
}

/* =====================================================
   NORMALIZAR TEXTO
===================================================== */

function normalizeText(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).replace(/\s+/g, " ").trim();
}

/* =====================================================
   NORMALIZAR CLAVE
===================================================== */

function normalizeKey(value) {
  return normalizeText(value)
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/* =====================================================
   CREAR SLUG
===================================================== */

function slugify(value) {
  return normalizeText(value)
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* =====================================================
   FORMATEAR TEXTO
===================================================== */

function formatDisplayText(value) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return "";
  }

  return normalizedValue
    .toLocaleLowerCase("es")
    .replace(/(^|\s|-)\p{L}/gu, (letter) => {
      return letter.toLocaleUpperCase("es");
    });
}

/* =====================================================
   ACORTAR TEXTO
===================================================== */

function truncateText(text, maximumLength = 125) {
  const normalizedText = normalizeText(text);

  if (normalizedText.length <= maximumLength) {
    return normalizedText;
  }

  const shortenedText = normalizedText.slice(0, maximumLength).trim();

  const lastSpaceIndex = shortenedText.lastIndexOf(" ");

  if (lastSpaceIndex <= 0) {
    return `${shortenedText}…`;
  }

  return `${shortenedText.slice(0, lastSpaceIndex)}…`;
}

/* =====================================================
   FORMATEAR CONTADOR
===================================================== */

function formatCounter(number) {
  return String(number).padStart(2, "0");
}

/* =====================================================
   LIMITAR NÚMERO
===================================================== */

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

/* =====================================================
   ESCAPAR HTML
===================================================== */

function escapeHTML(value) {
  const text = String(value ?? "");

  return text.replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return entities[character];
  });
}

/* =====================================================
   ESCAPAR ATRIBUTOS
===================================================== */

function escapeAttribute(value) {
  return escapeHTML(value);
}
