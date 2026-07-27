import "./global.css";

import { loadHeader } from "./components/header/header.js";
import { loadFooter } from "./components/footer/footer.js";
import { initCart } from "./components/cart/cart.js";
import {
  initProductCardNavigation,
} from "./components/product-card/product-card.js";

initProductCardNavigation();


async function initApp() {
  await loadHeader();
  await initCart();
  await loadFooter();
}


initApp();
