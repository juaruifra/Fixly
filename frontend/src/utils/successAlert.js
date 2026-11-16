import Swal from "sweetalert2";

const successClasses = {
  popup: "fixly-swal-popup",
  title: "fixly-swal-title",
  htmlContainer: "fixly-swal-message",
  confirmButton: "fixly-swal-confirm",
};

// Muestra el éxito solo cuando quien llama confirma que la operación terminó.
export async function showSuccessAlert(title, message) {
  await Swal.fire({
    icon: "success",
    title,
    text: message,
    confirmButtonText: "Aceptar",
    buttonsStyling: false,
    customClass: successClasses,
  });
}