import "./global.css";

import { loadHeader } from "./components/header/header.js";
import { loadFooter } from "./components/footer/footer.js";
import { initCart } from "./components/cart/cart.js";
import {
  initProductCardNavigation,
} from "./components/product-card/product-card.js";
import { initAnimations } from "./animations.js";

initProductCardNavigation();

function loadWhatsAppButton() {
  if (document.querySelector(".whatsapp-float")) return;

  const whatsappButton = document.createElement("a");

  whatsappButton.className = "whatsapp-float";
  whatsappButton.href =
    "https://wa.me/51999999999?text=Hola%2C%20quisiera%20recibir%20m%C3%A1s%20informaci%C3%B3n.";
  whatsappButton.target = "_blank";
  whatsappButton.rel = "noopener noreferrer";
  whatsappButton.setAttribute("aria-label", "Escríbenos por WhatsApp");

  whatsappButton.innerHTML = `
    <span class="whatsapp-float__message">¿Necesitas ayuda? Escríbenos</span>
    <span class="whatsapp-float__icon" aria-hidden="true">
      <i class="fa-brands fa-whatsapp"></i>
    </span>
  `;

  document.body.append(whatsappButton);
}


async function initApp() {
  initAnimations();
  loadWhatsAppButton();
  await loadHeader();
  await initCart();
  await loadFooter();
}


initApp();
