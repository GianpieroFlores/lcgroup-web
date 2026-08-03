import "./global.css";

import { loadHeader } from "./components/header/header.js";
import { loadFooter } from "./components/footer/footer.js";
import { initCart } from "./components/cart/cart.js";
import {
  initProductCardNavigation,
} from "./components/product-card/product-card.js";
import { initAnimations } from "./animations.js";
import { initGlobalAnalytics } from "./services/analytics.js";

initProductCardNavigation();
initGlobalAnalytics();

function playEntryIntro() {
  const storageKey = "lcgroup-entry-intro-seen-v2";
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  try {
    if (prefersReducedMotion || sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, "true");
  } catch {
    if (prefersReducedMotion) return;
  }

  const intro = document.createElement("div");

  intro.className = "entry-intro";
  intro.setAttribute("aria-hidden", "true");
  intro.innerHTML = `
    <div class="entry-intro__scene">
      <div class="entry-intro__glass">
        <svg viewBox="0 0 100 150" role="presentation">
          <path d="M20 10h60l-6 45c-2 17-12 27-24 27S28 72 26 55L20 10Z" />
          <path d="M50 82v43" />
          <path d="M30 137h40" />
        </svg>
      </div>
      <div class="entry-intro__fragments">
        ${Array.from({ length: 10 }, (_, index) => (
          `<span style="--fragment-index: ${index}"></span>`
        )).join("")}
      </div>
      <div class="entry-intro__base"></div>
    </div>
  `;

  document.body.classList.add("is-entry-intro-active");
  document.body.prepend(intro);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      intro.classList.add("is-playing");

      window.setTimeout(() => {
        intro.classList.add("is-shattered");
      }, 1250);

      window.setTimeout(() => {
        intro.classList.add("is-revealing");
        document.body.classList.remove("is-entry-intro-active");
      }, 2050);

      window.setTimeout(() => {
        intro.remove();
      }, 2750);
    });
  });
}

function loadWhatsAppButton() {
  if (document.querySelector(".whatsapp-float")) return;

  const whatsappButton = document.createElement("a");

  whatsappButton.className = "whatsapp-float";
  whatsappButton.href =
    "https://wa.me/51983276061?text=Hola%2C%20quisiera%20recibir%20m%C3%A1s%20informaci%C3%B3n.";
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
  playEntryIntro();
  initAnimations();
  loadWhatsAppButton();
  await loadHeader();
  await initCart();
  await loadFooter();
}


initApp();
