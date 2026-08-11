import "./information-pages.css";

const claimForm = document.querySelector("[data-claim-form]");
const claimStatus = document.querySelector("[data-claim-status]");
const claimSelect = document.querySelector("[data-claim-select]");

if (claimSelect) {
  const input = claimSelect.querySelector("input[name='subject']");
  const trigger = claimSelect.querySelector("[data-claim-select-trigger]");
  const value = claimSelect.querySelector("[data-claim-select-value]");
  const menu = claimSelect.querySelector("[data-claim-select-menu]");
  const error = claimSelect.querySelector("[data-claim-select-error]");
  const options = Array.from(menu.querySelectorAll("[role='option']"));

  const closeSelect = ({ returnFocus = false } = {}) => {
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    claimSelect.classList.remove("is-open");
    if (returnFocus) trigger.focus();
  };

  const openSelect = () => {
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    claimSelect.classList.add("is-open");
    const selected = options.find((option) => option.getAttribute("aria-selected") === "true");
    (selected || options[0])?.focus();
  };

  trigger.addEventListener("click", () => {
    if (menu.hidden) openSelect();
    else closeSelect();
  });

  options.forEach((option, index) => {
    option.addEventListener("click", () => {
      input.value = option.dataset.value;
      value.textContent = option.querySelector("strong").textContent;
      options.forEach((item) => item.setAttribute("aria-selected", String(item === option)));
      error.hidden = true;
      claimSelect.classList.remove("has-error");
      closeSelect({ returnFocus: true });
    });

    option.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        options[(index + direction + options.length) % options.length].focus();
      }
      if (event.key === "Escape" || event.key === "Tab") closeSelect({ returnFocus: event.key === "Escape" });
    });
  });

  document.addEventListener("click", (event) => {
    if (!claimSelect.contains(event.target)) closeSelect();
  });
}

if (claimForm && claimStatus) {
  claimForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const subjectInput = claimForm.querySelector("input[name='subject']");
    if (subjectInput && !subjectInput.value) {
      const select = claimForm.querySelector("[data-claim-select]");
      select?.classList.add("has-error");
      const error = select?.querySelector("[data-claim-select-error]");
      if (error) error.hidden = false;
      select?.querySelector("[data-claim-select-trigger]")?.focus();
      return;
    }

    claimStatus.textContent =
      "El registro digital aún no está habilitado. Comunícate con LC Group para recibir asistencia con tu solicitud.";
    claimStatus.classList.add("is-visible");
    claimStatus.focus();
  });
}
