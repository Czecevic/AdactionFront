import { handleLogin, handleLogout, showMainContent } from './js/connection.js';
import { showVolunteers, openVolunteerModal, openVolunteerEditModal } from './js/volunteers.js';
import { showCollects, openCollectEditModalLess, openCollectEditModalMore } from './js/collects.js';
import { showLoading, showAlert } from './js/ui.js';

// Expose only handlers used by inline HTML attributes
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.showMainContent = showMainContent;

window.showVolunteers = showVolunteers;
window.openVolunteerModal = openVolunteerModal;
window.openVolunteerEditModal = openVolunteerEditModal;

window.showCollects = showCollects;
window.openCollectEditModalLess = openCollectEditModalLess;
window.openCollectEditModalMore = openCollectEditModalMore;

// Also expose UI helpers if needed elsewhere
window.showLoading = showLoading;
window.showAlert = showAlert;

// === INITIALISATION ===
window.onload = function () {
  document.getElementById("auth-container").classList.remove("hidden");
  document.getElementById("main-content").classList.add("hidden");
};
