import "./delivery-banner.css";
import deliveryBannerHTML from "./delivery-banner.html?raw";
import { FREE_DELIVERY_THRESHOLD } from "../../config/delivery.js";

function updateDeliveryBannerVisibility() {
  document.documentElement.classList.toggle(
    "is-delivery-banner-hidden",
    window.scrollY > 1,
  );
}

export function loadDeliveryBanner() {
  if (document.querySelector(".delivery-banner")) {
    return;
  }

  const headerContainer = document.getElementById("header-container");

  if (!headerContainer) {
    return;
  }

  const bannerHTML = deliveryBannerHTML.replace(
    "{{FREE_DELIVERY_THRESHOLD}}",
    String(FREE_DELIVERY_THRESHOLD),
  );

  headerContainer.insertAdjacentHTML("beforebegin", bannerHTML);

  updateDeliveryBannerVisibility();
  window.addEventListener("scroll", updateDeliveryBannerVisibility, {
    passive: true,
  });
}
