/* =====================================================
   ESTILOS DEL CARRITO
===================================================== */

import "./cart.css";

/* =====================================================
   DATOS DE PRODUCTOS
===================================================== */

import products from "../../data/products.json";
import {
  findProductById,
  getPrimaryProductImage,
} from "../../utils/products.js";
import { createProductUrl } from "../../utils/urls.js";

/* =====================================================
   CONFIGURACIÓN
===================================================== */

const CART_STORAGE_KEY = "lcgroup-shopping-cart";
const WHATSAPP_NUMBER = "51955730008";

const CART_HTML_URL = new URL("./cart.html", import.meta.url);

/* =====================================================
   ESTADO DEL CARRITO
===================================================== */

let cartItems = [];
let cartInitialized = false;
let cartTriggerElement = null;

/* =====================================================
   REFERENCIAS DEL DOM
===================================================== */

let cartOverlay = null;
let cartPanel = null;
let cartCloseButton = null;
let cartContinueShoppingButton = null;

let cartProductsContainer = null;
let cartProductTemplate = null;
let cartEmpty = null;
let cartFooter = null;

let cartTotalItems = null;
let cartSummaryItems = null;
let cartTotalPrice = null;
let cartWhatsappButton = null;

const CART_FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/* =====================================================
   CARGAR CARRITO DESDE LOCALSTORAGE
===================================================== */

function loadCartFromStorage() {
  try {
    const storedCart = localStorage.getItem(CART_STORAGE_KEY);

    if (!storedCart) {
      return [];
    }

    const parsedCart = JSON.parse(storedCart);

    if (!Array.isArray(parsedCart)) {
      return [];
    }

    return parsedCart
      .filter((item) => {
        return item && item.id !== undefined && Number(item.quantity) > 0;
      })
      .map((item) => {
        return {
          id: item.id,
          name: item.name || "Producto",
          brand: item.brand || "",
          variant: item.variant || "",
          image:
            item.image ||
            getPrimaryProductImage(
              findProductById(products, item.id),
              "/src/assets/images/product-placeholder.png",
            ) ||
            "/src/assets/images/product-placeholder.png",
          price: Number(item.price) || 0,
          quantity: Math.max(1, Number(item.quantity) || 1),
        };
      });
  } catch (error) {
    console.error("No se pudo cargar el carrito:", error);
    return [];
  }
}

/* =====================================================
   GUARDAR CARRITO EN LOCALSTORAGE
===================================================== */

function saveCartToStorage() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  } catch (error) {
    console.error("No se pudo guardar el carrito:", error);
  }
}

/* =====================================================
   FORMATEAR PRECIO
===================================================== */

function formatPrice(value) {
  const price = Number(value) || 0;

  return `S/ ${price.toFixed(2)}`;
}

/* =====================================================
   BUSCAR PRODUCTO EN PRODUCTS.JSON
===================================================== */

function findCartItem(productId) {
  return cartItems.find((item) => {
    return String(item.id) === String(productId);
  });
}

/* =====================================================
   CALCULAR CANTIDAD TOTAL
===================================================== */

function getTotalQuantity() {
  return cartItems.reduce((total, item) => {
    return total + Number(item.quantity);
  }, 0);
}

/* =====================================================
   CALCULAR PRECIO TOTAL
===================================================== */

function getTotalPrice() {
  return cartItems.reduce((total, item) => {
    const price = Number(item.price) || 0;
    const quantity = Number(item.quantity) || 0;

    return total + price * quantity;
  }, 0);
}

/* =====================================================
   OBTENER ELEMENTOS DEL CARRITO
===================================================== */

function getCartElements() {
  cartOverlay = document.querySelector("#cart-overlay");
  cartPanel = document.querySelector("#cart-panel");

  cartCloseButton = document.querySelector("#cart-close-button");

  cartContinueShoppingButton = document.querySelector(
    "#cart-continue-shopping",
  );

  cartProductsContainer = document.querySelector("#cart-products");

  cartProductTemplate = document.querySelector("#cart-product-template");

  cartEmpty = document.querySelector("#cart-empty");
  cartFooter = document.querySelector("#cart-footer");

  cartTotalItems = document.querySelector("#cart-total-items");

  cartSummaryItems = document.querySelector("#cart-summary-items");

  cartTotalPrice = document.querySelector("#cart-total-price");

  cartWhatsappButton = document.querySelector("#cart-whatsapp-button");
}

/* =====================================================
   CARGAR HTML DEL CARRITO
===================================================== */

async function loadCartHTML() {
  if (document.querySelector("#cart-panel")) {
    return;
  }

  try {
    const response = await fetch(CART_HTML_URL);

    if (!response.ok) {
      throw new Error(`No se pudo cargar cart.html: ${response.status}`);
    }

    const cartHTML = await response.text();

    document.body.insertAdjacentHTML("beforeend", cartHTML);
  } catch (error) {
    console.error("Error cargando el carrito:", error);
  }
}

/* =====================================================
   ABRIR CARRITO
===================================================== */

function openCart() {
  if (!cartPanel || !cartOverlay) {
    return;
  }

  const activeElement = document.activeElement;

  if (
    activeElement instanceof HTMLElement &&
    !cartPanel.contains(activeElement)
  ) {
    cartTriggerElement = activeElement;
  }

  cartPanel.classList.add("is-open");
  cartOverlay.classList.add("is-open");

  cartPanel.setAttribute("aria-hidden", "false");
  cartOverlay.setAttribute("aria-hidden", "false");

  document.body.classList.add("cart-open");

  window.requestAnimationFrame(() => {
    cartCloseButton?.focus();
  });
}

/* =====================================================
   CERRAR CARRITO
===================================================== */

function closeCart() {
  if (!cartPanel || !cartOverlay) {
    return;
  }

  const cartWasOpen = cartPanel.classList.contains("is-open");

  cartPanel.classList.remove("is-open");
  cartOverlay.classList.remove("is-open");

  cartPanel.setAttribute("aria-hidden", "true");
  cartOverlay.setAttribute("aria-hidden", "true");

  document.body.classList.remove("cart-open");

  if (cartWasOpen && cartTriggerElement?.isConnected) {
    const elementToFocus = cartTriggerElement;

    cartTriggerElement = null;

    window.requestAnimationFrame(() => {
      elementToFocus.focus();
    });
  }
}

function getCartFocusableElements() {
  if (!cartPanel) {
    return [];
  }

  return Array.from(
    cartPanel.querySelectorAll(CART_FOCUSABLE_SELECTOR),
  ).filter((element) => {
    return (
      element instanceof HTMLElement &&
      !element.hidden &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.getAttribute("aria-disabled") !== "true" &&
      element.getClientRects().length > 0
    );
  });
}

function keepFocusInsideCart(event) {
  if (
    event.key !== "Tab" ||
    !cartPanel?.classList.contains("is-open")
  ) {
    return;
  }

  const focusableElements = getCartFocusableElements();

  if (focusableElements.length === 0) {
    event.preventDefault();
    cartPanel.focus();
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements.at(-1);
  const activeElement = document.activeElement;

  if (!cartPanel.contains(activeElement)) {
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

/* =====================================================
   AGREGAR PRODUCTO
===================================================== */

export function addProductToCart(product, quantity = 1) {
  if (!product || product.id === undefined) {
    console.error("No se puede agregar un producto sin ID.");

    return;
  }

  const requestedQuantity = Math.max(1, Number(quantity) || 1);

  const existingItem = findCartItem(product.id);

  if (existingItem) {
    existingItem.quantity += requestedQuantity;
  } else {
    cartItems.push({
      id: product.id,
      sku: product.sku || "",
      name: product.name || "Producto",
      brand: product.brand || "",
      variant: product.variant || "",
      image: getPrimaryProductImage(
        product,
        "/src/assets/images/product-placeholder.png",
      ),
      price: Number(product.price) || 0,
      quantity: requestedQuantity,
    });
  }

  updateCart();

  document.dispatchEvent(
    new CustomEvent("cart:product-added", {
      detail: {
        productId: product.id,
        quantity: requestedQuantity,
      },
    }),
  );
}

/* =====================================================
   ELIMINAR PRODUCTO
===================================================== */

function removeProductFromCart(productId) {
  cartItems = cartItems.filter((item) => {
    return String(item.id) !== String(productId);
  });

  updateCart();
}

/* =====================================================
   AUMENTAR CANTIDAD
===================================================== */

function increaseProductQuantity(productId) {
  const item = findCartItem(productId);

  if (!item) {
    return;
  }

  item.quantity += 1;

  updateCart();
}

/* =====================================================
   DISMINUIR CANTIDAD
===================================================== */

function decreaseProductQuantity(productId) {
  const item = findCartItem(productId);

  if (!item) {
    return;
  }

  if (item.quantity <= 1) {
    removeProductFromCart(productId);
    return;
  }

  item.quantity -= 1;

  updateCart();
}

/* =====================================================
   OBTENER COPIA DEL CARRITO
===================================================== */

function getCartItems() {
  return cartItems.map((item) => {
    return { ...item };
  });
}

/* =====================================================
   CREAR PRODUCTO DEL CARRITO
===================================================== */

function createCartProductElement(item) {
  if (!cartProductTemplate) {
    return null;
  }

  const fragment = cartProductTemplate.content.cloneNode(true);

  const cartProduct = fragment.querySelector(".cart-product");
  const sku = fragment.querySelector("[data-cart-product-sku]");

  const image = fragment.querySelector("[data-cart-product-image]");

  const brand = fragment.querySelector("[data-cart-product-brand]");

  const name = fragment.querySelector("[data-cart-product-name]");

  const variant = fragment.querySelector("[data-cart-product-variant]");

  const quantity = fragment.querySelector("[data-cart-product-quantity]");

  const unitPrice = fragment.querySelector("[data-cart-product-unit-price]");

  const totalPrice = fragment.querySelector("[data-cart-product-total-price]");

  const productLinks = fragment.querySelectorAll("[data-cart-product-link]");

  const productUrl = createProductUrl(item.id);

  cartProduct.dataset.cartProductId = item.id;

  if (image) {
    image.src = item.image;
    image.alt = item.name;
  }

  if (brand) {
    brand.textContent = item.brand;
  }
  if (sku) {
    sku.textContent = `SKU: ${item.sku}`;
  }

  if (name) {
    name.textContent = item.name;
  }

  if (variant) {
    variant.textContent = item.variant;
  }

  if (quantity) {
    quantity.textContent = item.quantity;
  }

  if (unitPrice) {
    unitPrice.textContent = `${formatPrice(item.price)} c/u`;
  }

  if (totalPrice) {
    totalPrice.textContent = formatPrice(item.price * item.quantity);
  }

  productLinks.forEach((link) => {
    link.href = productUrl;
  });

  return fragment;
}

/* =====================================================
   RENDERIZAR PRODUCTOS
===================================================== */

function renderCartProducts() {
  if (!cartProductsContainer) {
    return;
  }

  cartProductsContainer.innerHTML = "";

  cartItems.forEach((item) => {
    const productElement = createCartProductElement(item);

    if (productElement) {
      cartProductsContainer.appendChild(productElement);
    }
  });
}

/* =====================================================
   ACTUALIZAR ESTADO VACÍO
===================================================== */

function updateEmptyState() {
  const cartIsEmpty = cartItems.length === 0;

  cartEmpty?.classList.toggle("is-visible", cartIsEmpty);

  cartFooter?.classList.toggle("is-hidden", cartIsEmpty);

  if (cartProductsContainer) {
    cartProductsContainer.hidden = cartIsEmpty;
  }
}

/* =====================================================
   ACTUALIZAR RESUMEN
===================================================== */

function updateCartSummary() {
  const totalQuantity = getTotalQuantity();
  const totalPrice = getTotalPrice();

  if (cartTotalItems) {
    cartTotalItems.textContent = totalQuantity;
  }

  if (cartSummaryItems) {
    cartSummaryItems.textContent = totalQuantity;
  }

  if (cartTotalPrice) {
    cartTotalPrice.textContent = formatPrice(totalPrice);
  }
}

/* =====================================================
   ACTUALIZAR BADGE DEL HEADER
===================================================== */

function updateHeaderCartBadge() {
  const totalQuantity = getTotalQuantity();

  const badges = document.querySelectorAll(
    [
      "[data-cart-count]",
      "#cart-count",
      ".header-cart-count",
      ".cart-count",
    ].join(","),
  );

  badges.forEach((badge) => {
    badge.textContent = totalQuantity;

    badge.hidden = totalQuantity === 0;

    badge.setAttribute(
      "aria-label",
      `${totalQuantity} productos en el carrito`,
    );
  });
}

/* =====================================================
   GENERAR MENSAJE DE WHATSAPP
===================================================== */

function generateWhatsappMessage() {
  const totalQuantity = getTotalQuantity();
  const totalPrice = getTotalPrice();

  const lines = ["Hola, deseo realizar el siguiente pedido:", ""];

  cartItems.forEach((item, index) => {
    const productTotal = item.price * item.quantity;

    lines.push(`${index + 1}. ${item.name}`);
    if (item.sku) {
      lines.push(`SKU: ${item.sku}`);
    }

    if (item.brand) {
      lines.push(`Marca: ${item.brand}`);
    }

    if (item.variant) {
      lines.push(`Presentación: ${item.variant}`);
    }

    lines.push(
      `Cantidad: ${item.quantity}`,
      `Precio unitario: ${formatPrice(item.price)}`,
      `Subtotal: ${formatPrice(productTotal)}`,
      "",
    );
  });

  lines.push(
    "------------------------------",
    `Cantidad total: ${totalQuantity}`,
    `Total del pedido: ${formatPrice(totalPrice)}`,
    "",
    "Quedo atento a la confirmación de disponibilidad. Gracias.",
  );

  return lines.join("\n");
}

/* =====================================================
   ACTUALIZAR ENLACE DE WHATSAPP
===================================================== */

function updateWhatsappButton() {
  if (!cartWhatsappButton) {
    return;
  }

  const cartIsEmpty = cartItems.length === 0;

  if (cartIsEmpty) {
    cartWhatsappButton.href = "#";

    cartWhatsappButton.setAttribute("aria-disabled", "true");

    return;
  }

  const message = generateWhatsappMessage();

  cartWhatsappButton.href =
    `https://wa.me/${WHATSAPP_NUMBER}` + `?text=${encodeURIComponent(message)}`;

  cartWhatsappButton.setAttribute("aria-disabled", "false");
}

/* =====================================================
   RENDERIZAR ESTADO DEL CARRITO
===================================================== */

function renderCartState() {
  renderCartProducts();
  updateEmptyState();
  updateCartSummary();
  updateHeaderCartBadge();
  updateWhatsappButton();
}

/* =====================================================
   ACTUALIZAR TODO EL CARRITO
===================================================== */

function updateCart() {
  saveCartToStorage();
  renderCartState();

  document.dispatchEvent(
    new CustomEvent("cart:updated", {
      detail: {
        items: getCartItems(),
        totalQuantity: getTotalQuantity(),
        totalPrice: getTotalPrice(),
      },
    }),
  );
}

/* =====================================================
   EVENTOS DEL PANEL
===================================================== */

function setupCartPanelEvents() {
  cartCloseButton?.addEventListener("click", closeCart);

  cartOverlay?.addEventListener("click", closeCart);

  cartContinueShoppingButton?.addEventListener("click", closeCart);

  document.addEventListener("keydown", (event) => {
    if (!cartPanel?.classList.contains("is-open")) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeCart();
      return;
    }

    keepFocusInsideCart(event);
  });
}

/* =====================================================
   EVENTOS DE LOS PRODUCTOS DEL CARRITO
===================================================== */

function setupCartProductEvents() {
  cartProductsContainer?.addEventListener("click", (event) => {
    const productElement = event.target.closest("[data-cart-product-id]");

    if (!productElement) {
      return;
    }

    const productId = productElement.dataset.cartProductId;

    const increaseButton = event.target.closest("[data-cart-product-increase]");

    const decreaseButton = event.target.closest("[data-cart-product-decrease]");

    const deleteButton = event.target.closest("[data-cart-product-delete]");

    if (increaseButton) {
      increaseProductQuantity(productId);
      return;
    }

    if (decreaseButton) {
      decreaseProductQuantity(productId);
      return;
    }

    if (deleteButton) {
      removeProductFromCart(productId);
    }
  });
}

/* =====================================================
   BOTÓN DEL HEADER PARA ABRIR EL CARRITO
===================================================== */

function setupOpenCartButtons() {
  document.addEventListener("click", (event) => {
    const openButton = event.target.closest(
      [
        "[data-cart-open]",
        "#cart-button",
        ".header-cart-button",
        ".header-cart",
      ].join(","),
    );

    if (!openButton) {
      return;
    }

    event.preventDefault();
    openCart();
  });
}

/* =====================================================
   BOTONES DE LAS TARJETAS DE PRODUCTOS
===================================================== */

function setupProductCardButtons() {
  document.addEventListener("click", (event) => {
    const addButton = event.target.closest(".catalog-cart-button");

    if (!addButton) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const productCard = addButton.closest(".catalog-product-card");

    const productId =
      productCard?.dataset.productId ?? addButton.dataset.productId;

    if (!productId) {
      console.error("La tarjeta no contiene data-product-id.");

      return;
    }

    const product = findProductById(products, productId);

    if (!product) {
      console.error(`No se encontró el producto con ID ${productId}.`);

      return;
    }

    addProductToCart(product);

    addButton.classList.add("is-added");

    window.setTimeout(() => {
      addButton.classList.remove("is-added");
    }, 500);

    openCart();
  });
}

/* =====================================================
   SINCRONIZAR ENTRE PESTAÑAS DEL NAVEGADOR
===================================================== */

function setupStorageSynchronization() {
  window.addEventListener("storage", (event) => {
    if (event.key !== CART_STORAGE_KEY) {
      return;
    }

    cartItems = loadCartFromStorage();
    renderCartState();
  });
}

/* =====================================================
   INICIALIZAR CARRITO
===================================================== */

export async function initCart() {
  if (cartInitialized) {
    updateHeaderCartBadge();
    return;
  }

  cartInitialized = true;

  cartItems = loadCartFromStorage();

  await loadCartHTML();

  getCartElements();

  if (!cartPanel || !cartProductTemplate) {
    console.error("No se encontraron los elementos necesarios del carrito.");

    cartInitialized = false;
    return;
  }

  setupCartPanelEvents();
  setupCartProductEvents();
  setupOpenCartButtons();
  setupProductCardButtons();
  setupStorageSynchronization();

  updateCart();
}
