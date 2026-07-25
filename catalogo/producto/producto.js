import "./producto.css";
import { createProductCard } from "../../src/components/product-card/product-card.js";
let product = null;

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
  const id = getProductId();

  if (!id) {
    window.location.href = "/catalogo/";

    return;
  }

  const response = await fetch("/src/data/products.json");

  const products = await response.json();

  product = products.find((item) => item.id === id);

  if (!product) {
    window.location.href = "/catalogo/";

    return;
  }

  renderProduct(products);
}

/*=========================================
=            RENDERIZAR                   =
=========================================*/

function renderProduct(products) {
  document.title = `${product.name} | LC Group`;

  document.getElementById("breadcrumb-product").textContent = product.name;

  document.getElementById("product-brand").textContent = product.brand;

  document.getElementById("product-name").textContent = product.name;

  document.getElementById("product-variant").textContent = product.variant;

  document.getElementById("product-sku").textContent = `SKU: ${product.sku}`;

  document.getElementById("product-price").textContent =
    `S/ ${product.price.toFixed(2)}`;

  document.getElementById("product-description").textContent =
    product.description;

  document.getElementById("product-image").src = product.image;

  document.getElementById("product-image").alt = product.name;

  const stock = document.getElementById("product-stock");

  if (product.stock > 0) {
    stock.textContent = `${product.stock} disponibles`;

    stock.classList.remove("out-of-stock");
  } else {
    stock.textContent = "Sin stock";

    stock.classList.add("out-of-stock");
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
}

loadProduct();
