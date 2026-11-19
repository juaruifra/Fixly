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
  target,
}) {
  const result = await Swal.fire({
    icon: danger ? "warning" : "question",
    title,
    text: message,
    ...(target ? { target } : {}),
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