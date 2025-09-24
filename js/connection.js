
import { showCollects } from './collects.js'
import { API_URL } from './config.js';
import { showAlert, showLoading } from './ui.js';
import { setAuth, resetState, currentUser } from './state.js';
import { fetchWithAuth } from './api.js';

const mockUsers = [
    {
      username: "admin",
      password: "admin123",
      firstname: "Admin",
      lastname: "User",
      location: "Paris",
    },
  ];

const handleLogin = async (event) => {
    event.preventDefault();
  
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
  
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
  
      if (response.ok) {
        const data = await response.json();
        setAuth(data.token, data.user);
        showAlert("Connexion réussie !", "success");
        showMainContent();
      } else {
        throw new Error("Erreur de connexion");
      }
    } catch (error) {
      const user = mockUsers.find(
        (u) => u.username === username && u.password === password
      );
  
      if (user) {
        setAuth("mock-token-" + Date.now(), user);
        showAlert("Connexion réussie (mode démo) !", "success");
        showMainContent();
      } else {
        showAlert("Nom d'utilisateur ou mot de passe incorrect", "error");
      }
    }
  }
  
const handleLogout = () => {
    resetState();
  
    document.getElementById("auth-container").classList.remove("hidden");
    document.getElementById("main-content").classList.add("hidden");
    document.querySelectorAll("form").forEach((form) => form.reset());
  
    showAlert("Déconnexion réussie", "success");
  }
  
const showMainContent = () => {
    document.getElementById("auth-container").classList.add("hidden");
    document.getElementById("main-content").classList.remove("hidden");
    document.getElementById(
      "username"
    ).textContent = `Bienvenue ${currentUser.firstname} ${currentUser.lastname}`;
  
    if (currentUser && currentUser.role === "volunteer") {
      document.getElementById("btn-volunteers").classList.add("hidden");
      document.getElementById("btn-collects").classList.add("hidden");
      document.getElementById("collects-actions-btn").classList.add("hidden");
    } else {
      document.getElementById("btn-volunteers").classList.remove("hidden");
      document.getElementById("btn-collects").classList.remove("hidden");
      document.getElementById("collects-actions-btn").classList.remove("hidden");
    }
    showCollects();
  }

export { API_URL, handleLogin, handleLogout, showMainContent, fetchWithAuth, showLoading };