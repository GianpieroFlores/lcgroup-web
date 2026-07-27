import "./index.css";

import { createProductCard } from "./components/product-card/product-card.js";

let products = [];
/* ==========================================
   PRODUCTOS DESTACADOS
========================================== */

async function loadFeaturedProducts() {
  const response = await fetch("/src/data/products.json");

  products = await response.json();

  const featuredProducts = products.filter((product) => product.featured);

  const container = document.getElementById("featured-products");

  let html = "";

  for (const product of featuredProducts) {
    html += await createProductCard(product);
  }

  container.innerHTML = html;
}

/* ==========================================
   HERO SLIDER
========================================== */

function initializeHeroSlider() {
  const slides = document.querySelectorAll(".slide");

  const nextBtn = document.querySelector(".next");

  const prevBtn = document.querySelector(".prev");

  const dotsContainer = document.querySelector(".dots");

  if (!slides.length || !nextBtn || !prevBtn || !dotsContainer) {
    return;
  }

  let current = 0;

  let autoplay = null;

  const HERO_DURATION = 5000;

  dotsContainer.innerHTML = "";

  slides.forEach((_, index) => {
    const dot = document.createElement("button");

    dot.type = "button";

    dot.className = "dot";

    if (index === 0) {
      dot.classList.add("active");
    }

    dot.addEventListener("click", () => {
      current = index;

      update();

      restart();
    });

    dotsContainer.appendChild(dot);
  });

  const dots = dotsContainer.querySelectorAll(".dot");

  function update() {
    slides.forEach((slide) => slide.classList.remove("active"));

    dots.forEach((dot) => dot.classList.remove("active"));

    slides[current].classList.add("active");

    dots[current].classList.add("active");
  }

  function next() {
    current = (current + 1) % slides.length;

    update();
  }

  function previous() {
    current = (current - 1 + slides.length) % slides.length;

    update();
  }

  function restart() {
    clearInterval(autoplay);

    autoplay = setInterval(next, HERO_DURATION);
  }

  nextBtn.addEventListener("click", () => {
    next();

    restart();
  });

  prevBtn.addEventListener("click", () => {
    previous();

    restart();
  });

  update();

  restart();
}

/* ==========================================
   CARGA DE COLECCIONES
========================================== */

function renderCollections(products) {
  const collectionList = document.getElementById(
    "catalog-collection-list",
  );

  if (!collectionList) {
    return;
  }

  const collections = [
    ...new Set(
      products
        .map((product) => product.brand?.trim())
        .filter(Boolean),
    ),
  ]
    .sort((brandA, brandB) =>
      brandA.localeCompare(brandB, "es", {
        sensitivity: "base",
      }),
    )
    .slice(0, 6);

  collectionList.innerHTML = collections
    .map(
      (brand, index) => `
        <a
          href="/catalogo/?marca=${encodeURIComponent(brand)}"
          class="catalog-type-item${index === 0 ? " active" : ""}"
        >
          <span class="catalog-type-icon material-symbols-outlined">
            wine_bar
          </span>

          <span class="catalog-type-name">
            ${brand}
          </span>

          <span class="catalog-type-arrow material-symbols-outlined">
            chevron_right
          </span>
        </a>
      `,
    )
    .join("");
}

/* ==========================================
   CARRUSEL INFINITO DE PRODUCTOS
========================================== */

function initializeProductCarousel() {
  const productTrack = document.querySelector(".catalog-product-track");

  const productWindow = document.querySelector(".catalog-product-window");

  const productPrev = document.querySelector(".catalog-product-prev");

  const productNext = document.querySelector(".catalog-product-next");

  const productDotsContainer = document.querySelector(".catalog-product-dots");

  if (
    !productTrack ||
    !productWindow ||
    !productPrev ||
    !productNext ||
    !productDotsContainer
  ) {
    return;
  }

  /*
   * Evita agregar los eventos más de una vez.
   */
  if (productTrack.dataset.carouselInitialized === "true") {
    return;
  }

  productTrack.dataset.carouselInitialized = "true";

  /*
   * Las tarjetas originales ya fueron generadas
   * por loadFeaturedProducts().
   */
  const originalCards = Array.from(
    productTrack.querySelectorAll(".catalog-product-card"),
  );

  const totalProducts = originalCards.length;

  if (totalProducts === 0) {
    productPrev.hidden = true;
    productNext.hidden = true;
    productDotsContainer.hidden = true;

    return;
  }

  const ANIMATION_DURATION = 450;

  let currentIndex = 0;
  let physicalIndex = 0;
  let cloneCount = 0;
  let isAnimating = false;
  let resizeTimer = null;

  /* ==========================================
     MEDIDAS
  ========================================== */

  function getTrackGap() {
    const styles = window.getComputedStyle(productTrack);

    return (
      Number.parseFloat(styles.columnGap) || Number.parseFloat(styles.gap) || 0
    );
  }

  function getCardWidth() {
    const card =
      productTrack.querySelector(".catalog-product-card") || originalCards[0];

    if (!card) {
      return 0;
    }

    return card.getBoundingClientRect().width;
  }

  function getProductStep() {
    return getCardWidth() + getTrackGap();
  }

  function getVisibleProducts() {
    const cardWidth = getCardWidth();

    const windowWidth = productWindow.getBoundingClientRect().width;

    const gap = getTrackGap();

    if (cardWidth <= 0 || windowWidth <= 0) {
      return 1;
    }

    const visibleAmount = Math.floor((windowWidth + gap) / (cardWidth + gap));

    return Math.max(1, Math.min(visibleAmount, totalProducts));
  }

  function carouselIsNecessary() {
    return totalProducts > getVisibleProducts();
  }

  /* ==========================================
     UTILIDADES
  ========================================== */

  function normalizeIndex(index) {
    return ((index % totalProducts) + totalProducts) % totalProducts;
  }

  function setTrackPosition({ animate = false } = {}) {
    const step = getProductStep();

    productTrack.style.transition = animate
      ? `transform ${ANIMATION_DURATION}ms ease`
      : "none";

    productTrack.style.transform = `translateX(-${physicalIndex * step}px)`;
  }

  function forceTrackReflow() {
    void productTrack.offsetWidth;
  }

  /* ==========================================
     DOTS
  ========================================== */

  function createProductDots() {
    productDotsContainer.innerHTML = "";

    originalCards.forEach((card, index) => {
      const dot = document.createElement("button");

      const productName =
        card.querySelector(".catalog-product-name")?.textContent?.trim() ||
        `producto ${index + 1}`;

      dot.type = "button";
      dot.className = "catalog-product-dot";
      dot.dataset.productIndex = String(index);

      dot.setAttribute("aria-label", `Mostrar ${productName}`);

      dot.addEventListener("click", () => {
        moveToProduct(index);
      });

      productDotsContainer.appendChild(dot);
    });
  }

  function updateProductDots() {
    const dots = productDotsContainer.querySelectorAll(".catalog-product-dot");

    dots.forEach((dot, index) => {
      const isActive = index === currentIndex;

      dot.classList.toggle("active", isActive);

      dot.setAttribute("aria-current", isActive ? "true" : "false");
    });
  }

  /* ==========================================
     CONSTRUIR CARRUSEL
  ========================================== */

  function buildCarousel() {
    isAnimating = false;

    productTrack.style.transition = "none";
    productTrack.style.transform = "translateX(0)";

    productTrack.innerHTML = "";

    /*
     * Si todos los productos entran en pantalla,
     * no necesitamos clones ni movimiento.
     */
    if (!carouselIsNecessary()) {
      originalCards.forEach((card) => {
        productTrack.appendChild(card);
      });

      currentIndex = 0;
      physicalIndex = 0;
      cloneCount = 0;

      productPrev.hidden = true;
      productNext.hidden = true;
      productDotsContainer.hidden = true;

      setTrackPosition();

      return;
    }

    cloneCount = totalProducts;

    const startClones = originalCards
      .slice(totalProducts - cloneCount)
      .map((card) => {
        const clone = card.cloneNode(true);

        clone.dataset.carouselClone = "true";

        return clone;
      });

    const endClones = originalCards.slice(0, cloneCount).map((card) => {
      const clone = card.cloneNode(true);

      clone.dataset.carouselClone = "true";

      return clone;
    });

    const fragment = document.createDocumentFragment();

    startClones.forEach((clone) => {
      fragment.appendChild(clone);
    });

    originalCards.forEach((card) => {
      fragment.appendChild(card);
    });

    endClones.forEach((clone) => {
      fragment.appendChild(clone);
    });

    productTrack.appendChild(fragment);

    currentIndex = normalizeIndex(currentIndex);

    physicalIndex = cloneCount + currentIndex;

    productPrev.hidden = false;
    productNext.hidden = false;
    productDotsContainer.hidden = false;

    forceTrackReflow();
    setTrackPosition();
    updateProductDots();
  }

  /* ==========================================
     FINALIZAR ANIMACIÓN
  ========================================== */

  function normalizePhysicalPosition() {
    /*
     * Si estamos en los clones del final,
     * retrocedemos exactamente una vuelta completa,
     * conservando el producto seleccionado.
     */
    if (physicalIndex >= cloneCount + totalProducts) {
      physicalIndex -= totalProducts;
    }

    /*
     * Si estamos en los clones del inicio,
     * avanzamos exactamente una vuelta completa,
     * conservando el producto seleccionado.
     */
    if (physicalIndex < cloneCount) {
      physicalIndex += totalProducts;
    }

    currentIndex = normalizeIndex(physicalIndex - cloneCount);

    setTrackPosition({
      animate: false,
    });

    forceTrackReflow();

    updateProductDots();

    isAnimating = false;
  }

  function handleTransitionEnd(event) {
    if (event.target !== productTrack || event.propertyName !== "transform") {
      return;
    }

    normalizePhysicalPosition();
  }

  productTrack.addEventListener("transitionend", handleTransitionEnd);

  /* ==========================================
     MOVIMIENTO SIGUIENTE
  ========================================== */

  function moveProductNext() {
    if (isAnimating || !carouselIsNecessary()) {
      return;
    }

    isAnimating = true;

    currentIndex = normalizeIndex(currentIndex + 1);

    physicalIndex += 1;

    updateProductDots();

    setTrackPosition({
      animate: true,
    });
  }

  /* ==========================================
     MOVIMIENTO ANTERIOR
  ========================================== */

  function moveProductPrevious() {
    if (isAnimating || !carouselIsNecessary()) {
      return;
    }

    isAnimating = true;

    currentIndex = normalizeIndex(currentIndex - 1);

    physicalIndex -= 1;

    updateProductDots();

    setTrackPosition({
      animate: true,
    });
  }

  /* ==========================================
     IR A UN PRODUCTO CON DOT
  ========================================== */

  function moveToProduct(targetIndex) {
    if (
      isAnimating ||
      !carouselIsNecessary() ||
      targetIndex < 0 ||
      targetIndex >= totalProducts ||
      targetIndex === currentIndex
    ) {
      return;
    }

    const normalPosition = cloneCount + targetIndex;

    const previousLoopPosition = normalPosition - totalProducts;

    const nextLoopPosition = normalPosition + totalProducts;

    const possiblePositions = [
      previousLoopPosition,
      normalPosition,
      nextLoopPosition,
    ];

    /*
     * Escoge la representación más cercana del
     * producto para evitar recorrer todo el track.
     */
    physicalIndex = possiblePositions.reduce((closest, position) => {
      const closestDistance = Math.abs(closest - physicalIndex);

      const newDistance = Math.abs(position - physicalIndex);

      return newDistance < closestDistance ? position : closest;
    }, normalPosition);

    currentIndex = targetIndex;
    isAnimating = true;

    updateProductDots();

    setTrackPosition({
      animate: true,
    });
  }

  /* ==========================================
     EVENTOS
  ========================================== */

  productNext.addEventListener("click", moveProductNext);

  productPrev.addEventListener("click", moveProductPrevious);

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(() => {
      currentIndex = normalizeIndex(currentIndex);

      buildCarousel();
    }, 150);
  });

  /* ==========================================
     ESTADO INICIAL
  ========================================== */

  createProductDots();
  buildCarousel();
}

/* ==========================================
   PRODUCTO DESTACADO
========================================== */

function initializeFeaturedProduct() {
  const feature = document.querySelector(".catalog-feature");

  const featureImage = document.getElementById("catalog-feature-image");

  const featureBrand = document.getElementById("catalog-feature-brand");

  const featureTitle = document.getElementById("catalog-feature-title");

  const featureDescription = document.getElementById(
    "catalog-feature-description",
  );

  const productTrack = document.querySelector(".catalog-product-track");

  if (
    !feature ||
    !featureImage ||
    !featureBrand ||
    !featureTitle ||
    !featureDescription ||
    !productTrack
  ) {
    return;
  }

  productTrack.addEventListener("click", (event) => {
    const card = event.target.closest(".catalog-product-card");

    if (!card) {
      return;
    }

    const productId = Number(card.dataset.productId);

    const product = products.find((item) => item.id === productId);

    if (!product) {
      return;
    }

    /*
     * Selecciona todas las tarjetas
     * (originales y clones)
     * correspondientes al mismo producto.
     */
    productTrack
      .querySelectorAll(".catalog-product-card")
      .forEach((productCard) => {
        productCard.classList.toggle(
          "selected",
          Number(productCard.dataset.productId) === productId,
        );
      });

    featureImage.style.opacity = "0";

    setTimeout(() => {
      featureImage.src = product.image;

      featureImage.alt = product.name;

      featureBrand.textContent = product.brand;

      featureTitle.textContent = product.name;

      featureDescription.textContent = product.shortDescription;

      feature.classList.add("product-selected");

      featureImage.style.opacity = "1";
    }, 180);
  });

  /*
   * Seleccionar automáticamente
   * el primer producto destacado.
   */

  const firstCard = productTrack.querySelector(".catalog-product-card");

  if (firstCard) {
    firstCard.click();
  }
}

/* ==========================================
   INICIALIZAR INDEX
========================================== */

async function initializeIndex() {
  initializeHeroSlider();

  await loadFeaturedProducts();
  renderCollections(products);
  initializeProductCarousel();
  initializeFeaturedProduct();
}

initializeIndex();
