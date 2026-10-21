import Swal from "sweetalert2";

const confirmClasses = {
  popup: "fixly-swal-popup",
  title: "fixly-swal-title",
  htmlContainer: "fixly-swal-message",
  confirmButton: "fixly-swal-confirm",
  cancelButton: "fixly-swal-cancel",
};

export async function confirmServiceAction({
  title,
  message,
  confirmText,
  danger = false,
}) {
  const result = await Swal.fire({
    icon: danger ? "warning" : "question",
    title,
    text: message,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: "Cancelar",
    buttonsStyling: false,
    customClass: {
      ...confirmClasses,
      confirmButton: danger ? "fixly-swal-confirm fixly-swal-danger" : confirmClasses.confirmButton,
    },
  });

  return result.isConfirmed;
}