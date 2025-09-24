export const showAlert = (message, type) => {
  const existingAlerts = document.querySelectorAll(".alert");
  existingAlerts.forEach((alert) => alert.remove());

  const alert = document.createElement("div");
  alert.className = `alert ${type}`;
  alert.innerHTML = `
          <i class="fas fa-${
            type === "success"
              ? "check-circle"
              : type === "error"
              ? "exclamation-circle"
              : "info-circle"
          }"></i> 
          ${message}
        `;

  document.body.appendChild(alert);

  setTimeout(() => {
    alert.remove();
  }, 4000);
}

export const showLoading = (show) => {
  document.getElementById("loading").classList.toggle("hidden", !show);
} 