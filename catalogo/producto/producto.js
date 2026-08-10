import "./producto.css";
import products from "../../src/data/products.json";
import { createProductCard } from "../../src/components/product-card/product-card.js";
import { addProductToCart } from "../../src/components/cart/cart.js";
import { escapeAttribute, escapeHTML } from "../../src/utils/escape.js";
import { findProductById } from "../../src/utils/products.js";
import {
  trackProductNotFound,
  trackViewItem,
  trackViewItemList,
} from "../../src/services/analytics.js";


let product = null;
const MAX_REQUEST_QUANTITY = 99;

/*=========================================
=            OBTENER ID URL               =
=========================================*/

function getProductId() {
  const params = new URLSearchParams(window.location.search);

  return Number(params.get("id"));
}

/*=========================================
=            CARGAR JSON                  =
=========================================*/

async function loadProduct() {
  const requestedId = new URLSearchParams(window.location.search).get("id");
  const id = getProductId();

  if (!id) {
    trackProductNotFound(requestedId);
    window.location.href = "/catalogo/";

    return;
  }

product = findProductById(products, id);

  if (!product) {
    trackProductNotFound(requestedId);
    window.location.href = "/catalogo/";

    return;
  }

  renderProduct(products);
}

/*=========================================
=            RENDERIZAR                   =
=========================================*/

function renderProduct(products) {
  document.title = `${product.name} | SPIEGELAU`;
  const productPage = document.querySelector(".product-page");
  if (productPage) {
    productPage.dataset.analyticsProductId = String(product.sku || product.id);
    productPage.dataset.analyticsProductName = product.name;
  }
  trackViewItem(product);

  document.getElementById("breadcrumb-product").textContent = product.name;

  document.getElementById("product-collection").textContent =
    product.collection;

  document.getElementById("product-name").textContent = product.name;

  document.getElementById("product-presentation").textContent =
    product.presentation;

  document.getElementById("product-sku").textContent = `SKU: ${product.sku}`;

  document.getElementById("product-price").textContent =
    `S/ ${product.price.toFixed(2)}`;

  document.getElementById("product-short-description").textContent =
    product.shortDescription;

  initializeProductGallery(product);

  document.getElementById("tab-description").textContent = product.description;

  const stock = document.getElementById("product-stock");

  const specificationsContainer = document.getElementById("tab-specifications");

  specificationsContainer.innerHTML = product.specifications
    .map(
      (specification) => `
        <div class="product-specification-row">
          <span class="product-specification-label">
            ${escapeHTML(specification.label)}
          </span>

          <span class="product-specification-value">
            ${escapeHTML(specification.value)}
          </span>
        </div>
      `,
    )
    .join("");

  if (product.stock > 0) {
    stock.textContent = "Stock disponible · sujeto a confirmación";

    stock.classList.remove("out-of-stock");
    addCartButton.disabled = false;
    quantityInput.disabled = false;
    increaseButton.disabled = false;
    decreaseButton.disabled = false;




  } else {
    stock.textContent = "Stock agotado";

    stock.classList.add("out-of-stock");
    addCartButton.disabled = true;
    quantityInput.disabled = true;
    increaseButton.disabled = true;
    decreaseButton.disabled = true;




  }

  renderRelatedProducts(products);
}

async function renderRelatedProducts(products) {
  const relatedContainer = document.getElementById("related-products");

  if (!relatedContainer) {
    return;
  }

  const relatedProducts = products
    .filter(
      (item) => item.category === product.category && item.id !== product.id,
    )
    .slice(0, 4);

  if (relatedProducts.length === 0) {
    relatedContainer.innerHTML = `
            <p>No hay productos relacionados.</p>
        `;

    return;
  }

  const relatedCards = await Promise.all(
    relatedProducts.map((item) => createProductCard(item)),
  );

  relatedContainer.innerHTML = relatedCards.join("");
  trackViewItemList(
    relatedContainer,
    relatedProducts,
    "related_products",
    "Productos relacionados",
  );
}

/*=========================================
=            CANTIDAD PRODUCTO            =
=========================================*/


const quantityInput = document.getElementById("product-quantity");


const decreaseButton = document.getElementById("decrease-quantity");


const increaseButton = document.getElementById("increase-quantity");


const addCartButton = document.getElementById("add-cart-button");


/*=========================================
=            VALIDAR CANTIDAD             =
=========================================*/


function normalizeQuantity() {
  let quantity = Number(quantityInput.value);


  if (Number.isNaN(quantity) || quantity < 1) {
    quantity = 1;
  }


  quantity = Math.min(quantity, MAX_REQUEST_QUANTITY);


  quantityInput.value = quantity;


  return quantity;
}


/*=========================================
=            BOTÓN MENOS                  =
=========================================*/


decreaseButton.addEventListener("click", () => {
  const quantity = normalizeQuantity();


  quantityInput.value = Math.max(1, quantity - 1);
});


/*=========================================
=            BOTÓN MÁS                    =
=========================================*/


increaseButton.addEventListener("click", () => {
  const quantity = normalizeQuantity();


  if (quantity >= MAX_REQUEST_QUANTITY) {
    return;
  }


  quantityInput.value = quantity + 1;
});


/*=========================================
=            INPUT MANUAL                 =
=========================================*/


quantityInput.addEventListener("change", () => {
  normalizeQuantity();
});


quantityInput.addEventListener("blur", () => {
  normalizeQuantity();
});


/*=========================================
=            AGREGAR AL CARRITO           =
=========================================*/


addCartButton.addEventListener("click", () => {
  if (!product) {
    return;
  }


  const quantity = normalizeQuantity();


  addProductToCart(product, quantity);


  quantityInput.value = 1;
});

/* ==========================================
   ELEMENTOS DE LA GALERÍA
========================================== */

const productGallery = document.querySelector(
  ".product-gallery",
);

const productThumbnails = document.getElementById(
  "product-thumbnails",
);

const previousThumbnailsButton = document.getElementById(
  "product-thumbnails-previous",
);

const nextThumbnailsButton = document.getElementById(
  "product-thumbnails-next",
);

const productImage = document.getElementById(
  "product-image",
);

const previousImageButton = document.getElementById(
  "product-image-previous",
);

const nextImageButton = document.getElementById(
  "product-image-next",
);

const galleryCounter = document.getElementById(
  "product-gallery-counter",
);

const galleryCurrent = document.getElementById(
  "product-gallery-current",
);

const galleryTotal = document.getElementById(
  "product-gallery-total",
);

/* ==========================================
   ESTADO DE LA GALERÍA
========================================== */

let currentGallery = [];
let currentImageIndex = 0;

/* ==========================================
   OBTENER IMÁGENES DEL PRODUCTO
========================================== */

function getProductGallery(product) {
  if (!product) {
    return [];
  }

  /*
   * Formato recomendado:
   *
   * gallery: [
   *   {
   *     image: "...",
   *     alt: "..."
   *   }
   * ]
   */
  if (
    Array.isArray(product.gallery) &&
    product.gallery.length > 0
  ) {
    return product.gallery
      .map((item, index) => {
        /*
         * También acepta temporalmente:
         *
         * gallery: ["imagen1.webp", "imagen2.webp"]
         */
        if (typeof item === "string") {
          return {
            image: item,
            alt: `${product.name} - imagen ${index + 1}`,
          };
        }

        return {
          image: item?.image || "",
          alt:
            item?.alt ||
            `${product.name} - imagen ${index + 1}`,
        };
      })
      .filter((item) => item.image);
  }

  /*
   * Compatibilidad con el JSON antiguo.
   */
  if (product.image) {
    return [
      {
        image: product.image,
        alt: product.name || "Imagen del producto",
      },
    ];
  }

  return [];
}

/* ==========================================
   MOSTRAR IMAGEN SELECCIONADA
========================================== */

function showGalleryImage(index) {
  if (
    currentGallery.length === 0 ||
    !productImage
  ) {
    return;
  }

  /*
   * Permite que el carrusel sea circular.
   */
  if (index < 0) {
    currentImageIndex = currentGallery.length - 1;
  } else if (index >= currentGallery.length) {
    currentImageIndex = 0;
  } else {
    currentImageIndex = index;
  }

  const selectedImage =
    currentGallery[currentImageIndex];

  productImage.src = selectedImage.image;
  productImage.alt = selectedImage.alt;

  updateActiveThumbnail();
  updateGalleryCounter();
}

/* ==========================================
   ACTUALIZAR MINIATURA ACTIVA
========================================== */

function updateActiveThumbnail() {
  if (!productThumbnails) {
    return;
  }

  const thumbnails =
    productThumbnails.querySelectorAll(
      ".product-thumbnail",
    );

  thumbnails.forEach((thumbnail, index) => {
    const isActive = index === currentImageIndex;

    thumbnail.classList.toggle(
      "active",
      isActive,
    );

    if (isActive) {
      thumbnail.setAttribute(
        "aria-current",
        "true",
      );
      thumbnail.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    } else {
      thumbnail.removeAttribute(
        "aria-current",
      );
    }
  });
}

function updateThumbnailControls() {
  if (!productThumbnails) {
    return;
  }

  const isHorizontal = window.matchMedia(
    "(max-width: 768px)",
  ).matches;
  const position = isHorizontal
    ? productThumbnails.scrollLeft
    : productThumbnails.scrollTop;
  const viewportSize = isHorizontal
    ? productThumbnails.clientWidth
    : productThumbnails.clientHeight;
  const contentSize = isHorizontal
    ? productThumbnails.scrollWidth
    : productThumbnails.scrollHeight;
  const maximumPosition = Math.max(
    0,
    contentSize - viewportSize,
  );

  if (previousThumbnailsButton) {
    previousThumbnailsButton.disabled = position <= 1;
  }

  if (nextThumbnailsButton) {
    nextThumbnailsButton.disabled =
      position >= maximumPosition - 1;
  }
}

function scrollProductThumbnails(direction) {
  if (!productThumbnails) {
    return;
  }

  const thumbnail = productThumbnails.querySelector(
    ".product-thumbnail",
  );
  const styles = window.getComputedStyle(
    productThumbnails,
  );
  const gap = Number.parseFloat(styles.gap) || 0;
  const isHorizontal = window.matchMedia(
    "(max-width: 768px)",
  ).matches;
  const distance = thumbnail
    ? (isHorizontal
        ? thumbnail.offsetWidth
        : thumbnail.offsetHeight) + gap
    : 88;

  productThumbnails.scrollBy({
    left: isHorizontal ? direction * distance : 0,
    top: isHorizontal ? 0 : direction * distance,
    behavior: "smooth",
  });
}

/* ==========================================
   ACTUALIZAR CONTADOR
========================================== */

function updateGalleryCounter() {
  if (galleryCurrent) {
    galleryCurrent.textContent = String(
      currentImageIndex + 1,
    ).padStart(2, "0");
  }

  if (galleryTotal) {
    galleryTotal.textContent = String(
      currentGallery.length,
    ).padStart(2, "0");
  }
}

/* ==========================================
   GENERAR MINIATURAS
========================================== */

function renderProductThumbnails() {
  if (!productThumbnails) {
    return;
  }

  productThumbnails.innerHTML = currentGallery
    .map(
      (item, index) => `
        <button
          class="product-thumbnail ${
            index === 0 ? "active" : ""
          }"
          type="button"
          data-gallery-index="${index}"
          aria-label="Mostrar imagen ${index + 1} de ${
            currentGallery.length
          }"
          ${
            index === 0
              ? 'aria-current="true"'
              : ""
          }
        >
          <img
            src="${escapeAttribute(item.image)}"
            alt="${escapeAttribute(item.alt)}"
            loading="${index === 0 ? "eager" : "lazy"}"
          />
        </button>
      `,
    )
    .join("");

  productThumbnails.scrollTo({ top: 0, left: 0 });
  requestAnimationFrame(updateThumbnailControls);
}

/* ==========================================
   CONFIGURAR CONTROLES DE LA GALERÍA
========================================== */

function configureGalleryControls() {
  const hasMultipleImages =
    currentGallery.length > 1;

  productGallery?.classList.toggle(
    "is-single-image",
    !hasMultipleImages,
  );

  if (previousImageButton) {
    previousImageButton.hidden =
      !hasMultipleImages;
  }

  if (nextImageButton) {
    nextImageButton.hidden =
      !hasMultipleImages;
  }

  if (galleryCounter) {
    galleryCounter.hidden =
      !hasMultipleImages;
  }
}

/* ==========================================
   INICIALIZAR GALERÍA
========================================== */

function initializeProductGallery(product) {
  currentGallery = getProductGallery(product);
  currentImageIndex = 0;

  if (currentGallery.length === 0) {
    if (productImage) {
      productImage.removeAttribute("src");
      productImage.alt =
        "Imagen no disponible";
    }

    if (productThumbnails) {
      productThumbnails.innerHTML = "";
    }

    productGallery?.classList.add(
      "is-single-image",
    );

    return;
  }

  renderProductThumbnails();
  configureGalleryControls();
  showGalleryImage(0);
}

/* ==========================================
   EVENTOS DE LAS MINIATURAS
========================================== */

productThumbnails?.addEventListener(
  "click",
  (event) => {
    const thumbnail = event.target.closest(
      ".product-thumbnail",
    );

    if (!thumbnail) {
      return;
    }

    const imageIndex = Number(
      thumbnail.dataset.galleryIndex,
    );

    if (!Number.isInteger(imageIndex)) {
      return;
    }

    showGalleryImage(imageIndex);
  },
);

/* ==========================================
   EVENTOS DE LOS CONTROLES
========================================== */

previousImageButton?.addEventListener(
  "click",
  () => {
    showGalleryImage(currentImageIndex - 1);
  },
);

nextImageButton?.addEventListener(
  "click",
  () => {
    showGalleryImage(currentImageIndex + 1);
  },
);

previousThumbnailsButton?.addEventListener(
  "click",
  () => scrollProductThumbnails(-1),
);

nextThumbnailsButton?.addEventListener(
  "click",
  () => scrollProductThumbnails(1),
);

productThumbnails?.addEventListener(
  "scroll",
  updateThumbnailControls,
  { passive: true },
);

window.addEventListener(
  "resize",
  updateThumbnailControls,
);

/* ==========================================
   NAVEGACIÓN CON TECLADO
========================================== */

document.addEventListener("keydown", (event) => {
  if (currentGallery.length <= 1) {
    return;
  }

  /*
   * No cambia la galería mientras el usuario
   * escribe en un input o textarea.
   */
  const activeElement = document.activeElement;

  const isWriting =
    activeElement?.matches(
      "input, textarea, select",
    );

  if (isWriting) {
    return;
  }

  if (event.key === "ArrowLeft") {
    showGalleryImage(currentImageIndex - 1);
  }

  if (event.key === "ArrowRight") {
    showGalleryImage(currentImageIndex + 1);
  }
});
loadProduct();

