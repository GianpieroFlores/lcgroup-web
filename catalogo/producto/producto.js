import "./producto.css";
import { createProductCard } from "../../src/components/product-card/product-card.js";
import { addProductToCart } from "../../src/components/cart/cart.js";


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

  document.getElementById("product-short-description").textContent =
    product.shortDescription;

  document.getElementById("product-image").src = product.image;

  document.getElementById("product-image").alt = product.name;

  document.getElementById("tab-description").textContent = product.description;

  const stock = document.getElementById("product-stock");

  const specificationsContainer = document.getElementById("tab-specifications");

  specificationsContainer.innerHTML = product.specifications
    .map(
      (specification) => `
        <div class="product-specification-row">
          <span class="product-specification-label">
            ${specification.label}
          </span>

          <span class="product-specification-value">
            ${specification.value}
          </span>
        </div>
      `,
    )
    .join("");

  if (product.stock > 0) {
    stock.textContent = `${product.stock} disponibles`;

    stock.classList.remove("out-of-stock");
    addCartButton.disabled = false;
    quantityInput.disabled = false;
    increaseButton.disabled = false;
    decreaseButton.disabled = false;




  } else {
    stock.textContent = "Sin stock";

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


  if (product && quantity > product.stock) {
    quantity = product.stock;
  }


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


  if (product && quantity >= product.stock) {
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






loadProduct();

