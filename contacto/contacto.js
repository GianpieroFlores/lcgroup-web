import "./contacto.css";

// =====================================================
// CONFIGURACIÓN
// =====================================================

const WORKER_URL =
  "https://spiegelau-contact-api.pruebaform837.workers.dev";

const form = document.querySelector("#contact-form");
const submitButton = document.querySelector("#contact-submit");


// =====================================================
// FORMULARIO
// =====================================================

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  // ===================================================
  // OBTENER DATOS
  // ===================================================

  const name = document.querySelector("#name").value.trim();
  const email = document.querySelector("#email").value.trim();
  const phone = document.querySelector("#phone").value.trim();
  const company = document.querySelector("#company").value.trim();
  const message = document.querySelector("#message").value.trim();
  const honeypot = document.querySelector("#website").value.trim();


  // ===================================================
  // 1. HONEYPOT
  // ===================================================

  if (honeypot !== "") {
    return;
  }


  // ===================================================
  // 2. VALIDAR NOMBRE
  // ===================================================

  if (name.length < 2 || name.length > 60) {
    alert("Ingresa un nombre válido.");
    return;
  }


  // ===================================================
  // 3. VALIDAR CORREO
  // ===================================================

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    alert("Ingresa un correo electrónico válido.");
    return;
  }


  // ===================================================
  // 4. VALIDAR TELÉFONO
  // ===================================================

  const phoneRegex = /^[0-9+\s()-]{7,20}$/;

  if (!phoneRegex.test(phone)) {
    alert("Ingresa un teléfono válido.");
    return;
  }


  // ===================================================
  // 5. VALIDAR MENSAJE
  // ===================================================

  if (message.length < 10 || message.length > 1000) {
    alert(
      "El mensaje debe contener entre 10 y 1000 caracteres."
    );

    return;
  }


  // ===================================================
  // 6. OBTENER TOKEN TURNSTILE
  // ===================================================

  const turnstileToken = document.querySelector(
    '[name="cf-turnstile-response"]'
  )?.value;


  if (!turnstileToken) {
    alert("Completa la verificación de seguridad.");
    return;
  }


  // ===================================================
  // 7. BLOQUEAR BOTÓN
  // ===================================================

  submitButton.disabled = true;
  submitButton.textContent = "Enviando...";


  try {

    // =================================================
    // ENVIAR AL CLOUDFLARE WORKER
    // =================================================

    const response = await fetch(WORKER_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        name,
        email,
        phone,
        company,
        message,
        turnstileToken,
      }),
    });


    // =================================================
    // LEER RESPUESTA
    // =================================================

    const result = await response.json();


    // =================================================
    // ERROR DEL WORKER
    // =================================================

    if (!response.ok) {

  console.error("Worker respondió:", result);

  throw new Error(
    result.debug ||
    result.message ||
    "No se pudo enviar el mensaje."
  );
}


    // =================================================
    // ÉXITO
    // =================================================

    alert("Mensaje enviado correctamente.");

    form.reset();


    // =================================================
    // REINICIAR TURNSTILE
    // =================================================

    if (window.turnstile) {
      window.turnstile.reset();
    }


  } catch (error) {

    console.error(
      "Error enviando formulario:",
      error
    );

    alert(
      error.message ||
      "No se pudo enviar el mensaje."
    );


    // Reiniciamos Turnstile para permitir reintentar
    if (window.turnstile) {
      window.turnstile.reset();
    }


  } finally {

    // =================================================
    // RESTAURAR BOTÓN
    // =================================================

    submitButton.disabled = false;
    submitButton.textContent = "Enviar mensaje";

  }
});