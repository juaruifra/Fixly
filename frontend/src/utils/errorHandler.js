import Swal from "sweetalert2";
// SweetAlert2 necesita su hoja de estilos para dibujar correctamente la ventana.
import "sweetalert2/dist/sweetalert2.min.css";

// Mensajes escritos por la aplicación para los casos en que el backend no
// devuelve una explicación útil. La clave es el código HTTP recibido.
const STATUS_MESSAGES = {
  400: "La solicitud no es válida.",
  401: "Es necesario iniciar sesión para realizar esta acción.",
  403: "No tienes permiso para realizar esta acción.",
  404: "No se encontró el recurso solicitado.",
  409: "La operación entra en conflicto con el estado actual del recurso.",
  422: "Los datos enviados no han superado la validación.",
  500: "Se produjo un error interno en el servidor.",
};

// Extrae los errores concretos enviados por el backend.
// Según la ruta, pueden venir en "details", "errors" o dentro de "message".
function getResponseDetails(data) {
  // Elegimos la primera propiedad que contenga una lista. Si ninguna existe,
  // usamos una lista vacía para que el resto de la función sea sencillo.
  const details = Array.isArray(data?.details)
    ? data.details
    : Array.isArray(data?.errors)
      ? data.errors
      : Array.isArray(data?.message)
        ? data.message
        : [];

  return details
    .map((detail) => {
      // Algunas APIs devuelven directamente texto y otras objetos con msg/message.
      if (typeof detail === "string") return detail;
      if (typeof detail?.msg === "string") return detail.msg;
      if (typeof detail?.message === "string") return detail.message;
      // Ignoramos formatos que no sabemos mostrar como mensaje.
      return "";
    })
    // Quitamos los elementos vacíos que se hayan producido arriba.
    .filter(Boolean);
}

// Decide el texto principal de la alerta. Primero intenta usar el texto real
// enviado por el backend; solo crea un mensaje local si no hay uno aprovechable.
function getResponseMessage(data, status) {
  // El backend puede llamar al texto "message" o "error".
  const message = data?.message || data?.error;

  // Si ya es una frase, la mostramos sin sustituirla.
  if (typeof message === "string" && message.trim()) return message;

  // Si "message" es una lista, juntamos sus elementos en una sola frase.
  if (Array.isArray(message)) {
    const messages = getResponseDetails({ message });
    if (messages.length) return messages.join(" ");
  }

  // Este sí es un texto local: se usa solo si la respuesta no trajo mensaje.
  return STATUS_MESSAGES[status] || "Error de servidor";
}

// Convierte cualquier error de Axios en el mismo formato para toda la interfaz:
// status: código HTTP o null; message: texto principal; details: errores concretos;
// type: indica si fue HTTP, timeout, red o un error al preparar la petición.
export function normalizeAxiosError(error) {
  // El interceptor puede haber pasado ya el error por esta función.
  // Si reconocemos el formato normalizado, lo devolvemos sin procesarlo otra vez.
  if (
    typeof error?.message === "string" &&
    Array.isArray(error.details) &&
    ["http", "network", "timeout", "unknown"].includes(error.type)
  ) {
    return error;
  }

  // Si existe "response", el servidor sí contestó. Tomamos su estado y su cuerpo.
  if (error?.response) {
    // Algunas respuestas HTTP no tienen cuerpo; en ese caso usamos un objeto vacío.
    const data = error.response.data ?? {};

    return {
      status: error.response.status,
      message: getResponseMessage(data, error.response.status),
      details: getResponseDetails(data),
      type: "http",
    };
  }

  const isTimeout =
    error?.code === "ECONNABORTED" ||
    error?.code === "ETIMEDOUT" ||
    /timeout/i.test(error?.message || "");

  // Axios usa estos códigos cuando se agota el tiempo de espera. También
  // comprobamos el texto por si otra versión o adaptador usa un código distinto.
  if (isTimeout) {
    return {
      status: null,
      message: "La solicitud ha tardado demasiado. Inténtalo de nuevo.",
      details: [],
      type: "timeout",
    };
  }

  // Hay una petición, pero no respuesta: suele significar que el backend está
  // apagado o que hay un problema de red.
  if (error?.request) {
    return {
      status: null,
      message: "No se pudo contactar con la API. Revisa el backend y tu red.",
      details: [],
      type: "network",
    };
  }

  // No hubo respuesta ni petición enviada. Puede ser un error de configuración
  // o cualquier problema inesperado ocurrido antes de contactar con el backend.
  return {
    status: null,
    message: error?.message || "Error inesperado",
    details: [],
    type: "unknown",
  };
}

// SweetAlert2 recibe HTML para poder mostrar una lista de detalles. Antes de
// insertar texto del backend, convertimos los caracteres especiales para que
// se muestren literalmente y el navegador no los trate como etiquetas.
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    // La tabla convierte cada carácter especial en su equivalente seguro.
    return entities[character];
  });
}

// Presenta el error en una ventana común para toda la aplicación.
// Devuelve el error normalizado para que el llamador también pueda consultar,
// por ejemplo, su mensaje o el código HTTP después de cerrar la ventana.
export async function showApiErrorAlert(
  error,
  fallbackTitle = "No se pudo completar la solicitud",
) {
  // Acepta tanto un error Axios original como uno normalizado anteriormente.
  const normalized = normalizeAxiosError(error);

  // Creamos la lista solo cuando hay detalles; si no, queda vacía.
  const detailsHtml = normalized.details.length
    ? `<ul style="text-align:left;margin:0;padding-left:1rem;">${normalized.details
        .map((detail) => `<li>${escapeHtml(detail)}</li>`)
        .join("")}</ul>`
    : "";

  // Esperamos a que el usuario cierre la alerta antes de continuar.
  await Swal.fire({
    icon: "error",
    title: fallbackTitle,
    html: `${escapeHtml(normalized.message)}${detailsHtml}`,
    confirmButtonText: "Entendido",
    // Usamos nuestros estilos de Fixly, definidos en styles.css.
    buttonsStyling: false,
    customClass: {
      popup: "fixly-swal-popup",
      title: "fixly-swal-title",
      htmlContainer: "fixly-swal-message",
      confirmButton: "fixly-swal-confirm",
    },
  });

  return normalized;
}