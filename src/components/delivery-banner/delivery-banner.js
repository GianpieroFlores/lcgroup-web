import "./delivery-banner.css";
import deliveryBannerHTML from "./delivery-banner.html?raw";
import { FREE_DELIVERY_THRESHOLD } from "../../config/delivery.js";

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
}
