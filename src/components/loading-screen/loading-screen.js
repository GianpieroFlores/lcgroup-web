import "./loading-screen.css";
import loadingScreenHTML from "./loading-screen.html?raw";

const HOME_MINIMUM_VISIBLE_TIME = 1000;
const INNER_PAGE_REVEAL_DELAY = 1000;

function isHomePage() {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  return pathname === "/" || pathname === "/index.html";
}

export function showLoadingScreen() {
  const startedAt = performance.now();
  const isHome = isHomePage();
  let loadingScreen = null;
  let revealTimer = null;

  function mountLoadingScreen() {
    document.body.classList.add("is-page-loading");

    if (!document.getElementById("page-loading-screen")) {
      document.body.insertAdjacentHTML("afterbegin", loadingScreenHTML);
    }

    loadingScreen = document.getElementById("page-loading-screen");
  }

  if (isHome) {
    mountLoadingScreen();
  } else {
    revealTimer = window.setTimeout(
      mountLoadingScreen,
      INNER_PAGE_REVEAL_DELAY,
    );
  }

  return function hideLoadingScreen() {
    if (revealTimer) {
      window.clearTimeout(revealTimer);
    }

    if (!loadingScreen) return;

    const elapsedTime = performance.now() - startedAt;
    const remainingTime = isHome
      ? Math.max(0, HOME_MINIMUM_VISIBLE_TIME - elapsedTime)
      : 0;

    window.setTimeout(() => {
      document.body.classList.remove("is-page-loading");
      loadingScreen.classList.add("is-finished");
      loadingScreen.addEventListener(
        "transitionend",
        () => loadingScreen.remove(),
        { once: true },
      );
    }, remainingTime);
  };
}

export function waitForPageLoad() {
  if (document.readyState === "complete") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    window.addEventListener("load", resolve, { once: true });
  });
}
