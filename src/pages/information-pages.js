import "./information-pages.css";

const claimForm = document.querySelector("[data-claim-form]");
const claimStatus = document.querySelector("[data-claim-status]");

if (claimForm && claimStatus) {
  claimForm.addEventListener("submit", (event) => {
    event.preventDefault();

    claimStatus.textContent =
      "Esta es una plantilla de demostración. Conecta el formulario a un sistema de registro antes de publicarlo como Libro de Reclamaciones oficial.";
    claimStatus.classList.add("is-visible");
    claimStatus.focus();
  });
}
