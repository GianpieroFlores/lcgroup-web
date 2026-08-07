import "./index-prueba.css";
import productsData from "./data/products.json";
import { createProductCard } from "./components/product-card/product-card.js";
import { escapeAttribute, escapeHTML } from "./utils/escape.js";
import { createCatalogUrl } from "./utils/urls.js";
import { trackViewItemList } from "./services/analytics.js";

const FEATURED_AUTOPLAY_DELAY = 2_000;
// Volumen del video del hero: usa un valor entre 0 (silencio) y 1 (máximo).
const HERO_VIDEO_VOLUME = 0.20;
/* =====================================================
   PÁGINA DE INICIO
===================================================== */

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
  featuredAutoplayTimer: null,
  featuredAutoplayStoppedByClick: false,
  resizeTimer: null,
  ignoreFeaturedClickUntil: 0,
};

/* =====================================================
   ELEMENTOS DEL DOM
===================================================== */

const homeElements = {
  heroVideo: null,
  heroSoundButton: null,
  collectionExamples: null,
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

  initializeHeroVideoMotionPreference();
  showInitialLoadingStates();

  try {
    const products = await loadProducts();

    homeState.products = products;

    renderTemporaryCollections(products);
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
  homeElements.heroVideo = document.querySelector(".home-hero__video-element");
  homeElements.heroSoundButton = document.querySelector(
    "#home-hero-sound-button",
  );

  homeElements.collectionExamples = document.querySelector(
    "#home-collection-examples",
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
   PREFERENCIA DE MOVIMIENTO DEL VIDEO
===================================================== */

function initializeHeroVideoMotionPreference() {
  if (!homeElements.heroVideo) {
    return;
  }

  const reducedMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  homeElements.heroVideo.volume = HERO_VIDEO_VOLUME;
  homeElements.heroVideo.muted = true;

  const updateSoundButton = () => {
    if (!homeElements.heroSoundButton) return;

    const soundIsActive = !homeElements.heroVideo.muted;
    const icon = homeElements.heroSoundButton.querySelector(
      ".material-symbols-outlined",
    );
    const label = homeElements.heroSoundButton.querySelector(
      "[data-hero-sound-label]",
    );

    homeElements.heroSoundButton.setAttribute(
      "aria-pressed",
      String(soundIsActive),
    );
    homeElements.heroSoundButton.setAttribute(
      "aria-label",
      soundIsActive
        ? "Silenciar video"
        : "Activar sonido del video desde el inicio",
    );

    if (icon) {
      icon.textContent = soundIsActive ? "volume_up" : "volume_off";
    }

    if (label) {
      label.textContent = soundIsActive ? "Silenciar" : "Activar sonido";
    }
  };

  homeElements.heroSoundButton?.addEventListener("click", () => {
    if (homeElements.heroVideo.muted) {
      homeElements.heroVideo.currentTime = 0;
      homeElements.heroVideo.volume = HERO_VIDEO_VOLUME;
      homeElements.heroVideo.muted = false;

      const playPromise = homeElements.heroVideo.play();

      playPromise?.catch(() => {
        homeElements.heroVideo.muted = true;
        updateSoundButton();
      });
    } else {
      homeElements.heroVideo.muted = true;
    }

    updateSoundButton();
  });

  const updateVideoPlayback = () => {
    if (reducedMotionQuery.matches) {
      homeElements.heroVideo.pause();
      return;
    }

    const playPromise = homeElements.heroVideo.play();

    playPromise?.catch(() => {
      /*
       * El navegador puede bloquear la reproduccion automatica.
       * El video permanece disponible sin alterar el contenido.
       */
    });
  };

  updateVideoPlayback();
  updateSoundButton();
  reducedMotionQuery.addEventListener("change", updateVideoPlayback);
}

/* =====================================================
   VERIFICAR PÁGINA
===================================================== */

function isHomePage() {
  return Boolean(
    homeElements.collectionExamples ||
    homeElements.featuredTrack,
  );
}

/* =====================================================
   CARGAR PRODUCTOS
===================================================== */

async function loadProducts() {
  const data = productsData;

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
  if (homeElements.collectionExamples) {
    homeElements.collectionExamples.innerHTML = createStatusMarkup(
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

  if (homeElements.collectionExamples) {
    homeElements.collectionExamples.innerHTML = createStatusMarkup(
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
   COLECCIONES TEMPORALES
===================================================== */

function renderTemporaryCollections(products) {
  if (!homeElements.collectionExamples) {
    return;
  }

  const collections = getTemporaryCollections(products);

  if (collections.length === 0) {
    homeElements.collectionExamples.innerHTML = createStatusMarkup(
      "home-empty",
      "No hay colecciones disponibles por el momento.",
    );
    return;
  }

  homeElements.collectionExamples.innerHTML = collections
    .map((collection, index) => {
      return createTemporaryCollectionCard(collection, index);
    })
    .join("");
}

/*
 * Datos provisionales para validar el diseño. Sustituir este generador y su
 * renderizado por las 10 colecciones estáticas definitivas del cliente.
 */
function getTemporaryCollections(products) {
  const uniqueCollections = new Map();

  products.forEach((product) => {
    const collection = normalizeText(product.collection);
    const category = normalizeText(product.category);

    if (!collection || !category) {
      return;
    }

    const key = [collection, category].map(normalizeKey).join("|");

    if (uniqueCollections.has(key)) {
      return;
    }

    uniqueCollections.set(key, {
      title: `Colección ${formatDisplayText(collection)} ${formatDisplayText(category)}`,
      collectionLabel: `Colección ${formatDisplayText(collection)}`,
      categoryLabel: formatDisplayText(category),
      collection,
      category,
    });
  });

  return Array.from(uniqueCollections.values()).slice(0, 10);
}

function createTemporaryCollectionCard(collection, index) {
  const url = createCatalogUrl({
    coleccion: collection.collection,
    categoria: collection.category,
  });

  return `
    <a
      class="home-collection-card"
      href="${escapeAttribute(url)}"
      aria-label="Explorar ${escapeAttribute(collection.title)}"
      data-analytics-event="collection_click"
      data-analytics-value="${escapeAttribute(collection.collection)}"
    >
      <span class="home-collection-card__number">
        ${formatCounter(index + 1)}
      </span>
      <span class="home-collection-card__text">
        <strong>${escapeHTML(collection.collectionLabel)}</strong>
        <span>${escapeHTML(collection.categoryLabel)}</span>
      </span>
      <span class="material-symbols-outlined" aria-hidden="true">
        arrow_forward
      </span>
    </a>
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

  trackViewItemList(
    homeElements.featuredTrack,
    homeState.featuredProducts,
    "home_featured_products",
    "Productos destacados",
  );

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
      handleFeaturedPreviousClick,
    );

    homeElements.featuredPreviousButton?.addEventListener(
      "mouseenter",
      stopFeaturedAutoplay,
    );

    homeElements.featuredPreviousButton?.addEventListener(
      "mouseleave",
      startFeaturedAutoplay,
    );

    homeElements.featuredNextButton?.addEventListener(
      "click",
      handleFeaturedNextClick,
    );

    homeElements.featuredNextButton?.addEventListener(
      "mouseenter",
      stopFeaturedAutoplay,
    );

    homeElements.featuredNextButton?.addEventListener(
      "mouseleave",
      startFeaturedAutoplay,
    );

    homeElements.featuredPagination?.addEventListener(
      "click",
      handleFeaturedPaginationClick,
    );

    homeElements.featuredTrack.addEventListener(
      "click",
      handleFeaturedSlideClick,
    );

    homeElements.featuredTrack.addEventListener(
      "mouseover",
      handleFeaturedActiveSlideMouseOver,
    );

    homeElements.featuredTrack.addEventListener(
      "mouseout",
      handleFeaturedActiveSlideMouseOut,
    );

    setupFeaturedCarouselSwipe();

    window.addEventListener("resize", handleFeaturedCarouselResize);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopFeaturedAutoplay();
      } else {
        startFeaturedAutoplay();
      }
    });

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

  startFeaturedAutoplay();
}

function handleFeaturedPreviousClick(event) {
  event.preventDefault();
  event.stopPropagation();

  homeState.featuredAutoplayStoppedByClick = false;
  showPreviousFeaturedProduct();

  if (!event.currentTarget.matches(":hover")) {
    startFeaturedAutoplay();
  }
}

function handleFeaturedNextClick(event) {
  event.preventDefault();
  event.stopPropagation();

  homeState.featuredAutoplayStoppedByClick = false;
  showNextFeaturedProduct();

  if (!event.currentTarget.matches(":hover")) {
    startFeaturedAutoplay();
  }
}

/* =====================================================
   REPRODUCCIÓN AUTOMÁTICA DEL CARRUSEL
===================================================== */

function stopFeaturedAutoplay() {
  window.clearTimeout(homeState.featuredAutoplayTimer);
  homeState.featuredAutoplayTimer = null;
}

function startFeaturedAutoplay() {
  stopFeaturedAutoplay();

  if (
    document.hidden ||
    homeState.featuredAutoplayStoppedByClick ||
    homeState.featuredProducts.length <= 1
  ) {
    return;
  }

  homeState.featuredAutoplayTimer = window.setTimeout(() => {
    showNextFeaturedProduct();
    startFeaturedAutoplay();
  }, FEATURED_AUTOPLAY_DELAY);
}

/* =====================================================
   SELECCIONAR UNA TARJETA LATERAL
===================================================== */

function handleFeaturedSlideClick(event) {
  if (Date.now() < homeState.ignoreFeaturedClickUntil) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  const slide = event.target.closest("[data-carousel-slide]");

  if (!slide) {
    return;
  }

  if (slide.classList.contains("is-active")) {
    homeState.featuredAutoplayStoppedByClick = true;
    stopFeaturedAutoplay();
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  goToFeaturedProduct(slide.dataset.realIndex);
}

function handleFeaturedActiveSlideMouseOver(event) {
  const activeSlide = event.target.closest(
    "[data-carousel-slide].is-active",
  );

  if (!activeSlide || activeSlide.contains(event.relatedTarget)) {
    return;
  }

  stopFeaturedAutoplay();
}

function handleFeaturedActiveSlideMouseOut(event) {
  const activeSlide = event.target.closest(
    "[data-carousel-slide].is-active",
  );

  if (!activeSlide || activeSlide.contains(event.relatedTarget)) {
    return;
  }

  startFeaturedAutoplay();
}

/* =====================================================
   DESLIZAR EL CARRUSEL EN PANTALLAS TÁCTILES
===================================================== */

function setupFeaturedCarouselSwipe() {
  const viewport = homeElements.featuredViewport;

  if (!viewport) {
    return;
  }

  const minimumSwipeDistance = 48;

  let touchStartX = 0;
  let touchStartY = 0;

  viewport.addEventListener(
    "touchstart",
    (event) => {
      const touch = event.touches[0];

      if (!touch) {
        return;
      }

      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    },
    { passive: true },
  );

  viewport.addEventListener(
    "touchend",
    (event) => {
      const touch = event.changedTouches[0];

      if (!touch) {
        return;
      }

      const horizontalDistance = touch.clientX - touchStartX;
      const verticalDistance = touch.clientY - touchStartY;

      const isHorizontalSwipe =
        Math.abs(horizontalDistance) >= minimumSwipeDistance &&
        Math.abs(horizontalDistance) > Math.abs(verticalDistance);

      if (!isHorizontalSwipe) {
        return;
      }

      homeState.ignoreFeaturedClickUntil = Date.now() + 500;

      if (horizontalDistance < 0) {
        showNextFeaturedProduct();
      } else {
        showPreviousFeaturedProduct();
      }
    },
    { passive: true },
  );
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

  /*
   * Escritorio grande.
   */
  if (viewportWidth >= 1200) {
    horizontalStep = slideWidth * 1;

    sideScale = 0.82;
    farScale = 0.68;
    sideRotation = 7;
  } else if (viewportWidth >= 768) {
    /*
     * Escritorio y tablet horizontal.
     */
    horizontalStep = Math.min(slideWidth * 0.72, viewportWidth * 0.31);

    sideScale = 0.8;
    farScale = 0.65;
    sideRotation = 6;
  } else {
    /*
     * Teléfonos.
     */
    horizontalStep = Math.min(slideWidth * 0.64, viewportWidth * 0.58);

    sideScale = 0.78;
    farScale = 0.62;
    sideRotation = 4;
  }

  return {
    viewportWidth,
    slideWidth,
    horizontalStep,
    sideScale,
    farScale,
    sideRotation,
  };
}

/* =====================================================
   POSICIONAR TARJETA
===================================================== */

function positionFeaturedSlide(slide, distance, measurements, animate) {
  const absoluteDistance = Math.abs(distance);

  const isActive = distance === 0;

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

  slide.style.pointerEvents = opacity > 0 ? "auto" : "none";
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
   FORMATEAR CONTADOR
===================================================== */

function formatCounter(number) {
  return String(number).padStart(2, "0");
}

