import { fetchWithAuth } from './api.js';
import { showAlert, showLoading } from './ui.js';
import { collects } from './state.js';

const loadCollects = async () => {
    showLoading(true);
  
    try {
      const response = await fetchWithAuth(`/collects`);
  
      if (response.ok) {
        const data = await response.json();
        collects.length = 0;
        collects.push(...data);
      } else {
        throw new Error("Erreur lors du chargement");
      }
    } catch (error) {
      console.log("API non disponible, utilisation des données simulées");
      collects.length = 0;
      collects.push(
        {
          id: 1,
          item: "Vêtements",
          quantity: 50,
          location: "Paris",
          date: "2023-10-01",
        },
        {
          id: 2,
          item: "Nourriture",
          quantity: 30,
          location: "Lyon",
          date: "2023-10-05",
        },
        {
          id: 3,
          item: "Jouets",
          quantity: 25,
          location: "Marseille",
          date: "2023-10-10",
        },
      );
    }
  
    displayCollects();
    showLoading(false);
  }
  
const createCollect = async (collectData) => {
    try {
      const response = await fetchWithAuth(`/collects`, {
        method: "POST",
        body: JSON.stringify(collectData),
      });
  
      if (response.ok) {
        const newCollect = await response.json();
        collects.push(newCollect);
        showAlert("Collecte créée avec succès !", "success");
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.message || "Erreur lors de la création");
      }
    } catch (error) {
      console.log("Mode simulé - Création de la collecte");
      const newId = Math.max(...collects.map((c) => c.id || 0)) + 1;
      const newCollect = { id: newId, ...collectData };
      collects.push(newCollect);
      showAlert("Collecte créée avec succès (mode démo) !", "success");
      return true;
    }
  }
  
const updateCollect = async (id, partial) => {
  const current = collects.find(c => c.id == id);
  if (!current) return false;

  const response = await fetchWithAuth(`/collects/${id}`, {
    method: "PUT", // passe à PUT si PATCH n’est pas supporté
    body: JSON.stringify({ ...current, ...partial }),
  });

  if (response.ok) {
    const updated = await response.json();
    const i = collects.findIndex(c => c.id == id);
    if (i !== -1) collects[i] = updated;
    showAlert("Collecte modifiée avec succès !", "success");
    return true;
  }
  const error = await response.json().catch(() => ({}));
  throw new Error(error.message || "Erreur lors de la modification");
};
  
const deleteCollect = async (id) => {
    try {
      const response = await fetchWithAuth(`/collects/${id}`, {
        method: "DELETE",
      });
  
      if (response.ok) {
        const idx = collects.findIndex((c) => c.id == id);
        if (idx !== -1) collects.splice(idx, 1);
        showAlert("Collecte supprimée avec succès !", "success");
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.message || "Erreur lors de la suppression");
      }
    } catch (error) {
      console.log("Mode simulé - Suppression de la collecte");
      const idx = collects.findIndex((c) => c.id == id);
      if (idx !== -1) collects.splice(idx, 1);
      showAlert("Collecte non modifié !", "error");
      return true;
    }
  }
  
export const displayCollects = () => {
    const container = document.getElementById("collects-list");

    console.log(collects)
  
    if (collects.length === 0) {
      container.innerHTML = `
              <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #6b7280;">
                <i class="fas fa-box" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p style="font-size: 1.2rem;">Aucune collecte trouvée</p>
                <p>Cliquez sur "Ajouter Collecte" pour commencer</p>
              </div>
            `;
      return;
    }
  
    container.innerHTML = collects
      .map(
        (collect) => `
              <div class="data-card">
                <h3>
                  <i class="fas fa-box"></i> 
                  ${collect.type}
                </h3>
                <p>
                  <i class="fas fa-weight"></i> 
                  <strong>Quantité:</strong> ${collect.quantity}
                </p>
                <p>
                  <i class="fas fa-map-marker-alt"></i> 
                  <strong>Lieu:</strong> ${collect.location || "Non spécifié"}
                </p>
                <p>
                  <i class="fas fa-calendar"></i> 
                  <strong>Date:</strong> ${
                    collect.date
                      ? new Date(collect.date).toLocaleDateString("fr-FR")
                      : "Non spécifiée"
                  }
                </p>
                  
                <div class="card-actions">
                <button class="btn btn-danger" onclick="openCollectEditModalLess(${collect.id})">
                -
                </button>
                <button class="btn btn-success" onclick="openCollectEditModalMore(${collect.id})">
                +
                </button>
                </div>
              </div>
            `
      )
      .join("");
  }

export const showCollects = () => {
  document.getElementById("volunteers-section").classList.add("hidden");
  document.getElementById("collects-section").classList.remove("hidden");
  document.getElementById("btn-volunteers").classList.remove("active");
  document.getElementById("btn-collects").classList.add("active");
  loadCollects();
}

export const openCollectEditModalMore = async (id) => {
  const collect = collects.find(c => c.id == id);
  if (!collect) return;
  const newQuantity = collect.quantity + 1;

  const ok = await updateCollect(id, { quantity: newQuantity });
  if (ok) {
    collect.quantity = newQuantity;
    displayCollects();
  } else {
    showAlert("Échec de la mise à jour de la quantité", "error");
  }
};

export const openCollectEditModalLess = async (id) => {
  const collect = collects.find(c => c.id == id);
  if (!collect || collect.quantity <= 0) return;
  const newQuantity = collect.quantity - 1;

  const ok = await updateCollect(id, { quantity: newQuantity });
  if (ok) {
    collect.quantity = newQuantity;
    displayCollects();
  } else {
    showAlert("Échec de la mise à jour de la quantité", "error");
  }
};

export { loadCollects, createCollect, updateCollect, deleteCollect };