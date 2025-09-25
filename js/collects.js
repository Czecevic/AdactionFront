import { fetchWithAuth } from "./api.js";
import { showAlert, showLoading } from "./ui.js";
import { collects } from "./state.js";

function parseDateInput(value) {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

function populateCollectLocationFilter() {
  const select = document.getElementById('filter-location');
  if (!select) return;
  const uniqueLocations = Array.from(
    new Set(
      collects
        .map(c => (c.location || c.place || '').trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const currentValue = select.value;
  select.innerHTML = '<option value="">Tous les lieux</option>' +
    uniqueLocations.map(loc => `<option value="${loc}">${loc}</option>`).join('');

  if (currentValue && uniqueLocations.includes(currentValue)) {
    select.value = currentValue;
  }
}

function sortCollects(list) {
  const sortByEl = document.getElementById('sort-by');
  const sortOrderEl = document.getElementById('sort-order');
  const sortBy = sortByEl?.value || 'date';
  const order = sortOrderEl?.dataset?.order === 'asc' ? 'asc' : 'desc';
  const multiplier = order === 'asc' ? 1 : -1;

  const compareStrings = (a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }) * multiplier;
  const compareNumbers = (a, b) => ((a || 0) - (b || 0)) * multiplier;

  return [...list].sort((a, b) => {
    switch (sortBy) {
      case 'item': {
        const av = (a.item || a.type || '').toString();
        const bv = (b.item || b.type || '').toString();
        return compareStrings(av, bv);
      }
      case 'location': {
        const av = (a.location || a.place || '').toString();
        const bv = (b.location || b.place || '').toString();
        return compareStrings(av, bv);
      }
      case 'quantity': {
        return compareNumbers(Number(a.quantity || 0), Number(b.quantity || 0));
      }
      case 'date':
      default: {
        const ad = a.date ? new Date(a.date) : null;
        const bd = b.date ? new Date(b.date) : null;
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        return (ad.getTime() - bd.getTime()) * multiplier;
      }
    }
  });
}

function applyCollectFilters() {
  const searchInput = document.getElementById('search-input');
  const locationSelect = document.getElementById('filter-location');
  const dateFromInput = document.getElementById('filter-date-from');
  const dateToInput = document.getElementById('filter-date-to');

  const query = (searchInput?.value || '').trim().toLowerCase();
  const selectedLocation = (locationSelect?.value || '').trim().toLowerCase();
  const dateFrom = parseDateInput(dateFromInput?.value || '');
  const dateToRaw = parseDateInput(dateToInput?.value || '');
  const dateTo = dateToRaw ? new Date(dateToRaw.getFullYear(), dateToRaw.getMonth(), dateToRaw.getDate(), 23, 59, 59, 999) : null;

  const filtered = collects.filter((c) => {
    if (query) {
      const haystack = `${c.item || c.type || ''} ${c.location || c.place || ''}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    if (selectedLocation) {
      const loc = (c.location || c.place || '').toLowerCase();
      if (loc !== selectedLocation) return false;
    }

    if (dateFrom || dateTo) {
      if (!c.date) return false;
      const d = new Date(c.date);
      if (isNaN(d.getTime())) return false;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
    }

    return true;
  });

  const sorted = sortCollects(filtered);
  displayCollects(sorted);
}

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
      }
    );
  }

  populateCollectLocationFilter();
  applyCollectFilters();
  showLoading(false);
};

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
      populateCollectLocationFilter();
      applyCollectFilters();
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
    populateCollectLocationFilter();
    applyCollectFilters();
    return true;
  }
};

const updateCollect = async (id, partial) => {
  const current = collects.find((c) => c.id == id);
  if (!current) return false;

  const response = await fetchWithAuth(`/collects/${id}`, {
    method: "PUT", // passe à PUT si PATCH n’est pas supporté
    body: JSON.stringify({ ...current, ...partial }),
  });

  if (response.ok) {
    const updated = await response.json();
    const i = collects.findIndex((c) => c.id == id);
    if (i !== -1) collects[i] = updated;
    showAlert("Collecte modifiée avec succès !", "success");
    populateCollectLocationFilter();
    applyCollectFilters();
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
      populateCollectLocationFilter();
      applyCollectFilters();
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
    populateCollectLocationFilter();
    applyCollectFilters();
    return true;
  }
};

export const displayCollects = (list = collects) => {
  const container = document.getElementById("collects-list");

  if (list.length === 0) {
    container.innerHTML = `
              <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #6b7280;">
                <i class="fas fa-box" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p style="font-size: 1.2rem;">Aucune collecte trouvée</p>
                <p>Cliquez sur "Ajouter Collecte" pour commencer</p>
              </div>
            `;
    return;
  }

  container.innerHTML = list
    .map(
      (collect) => `
              <div class="data-card">
                <h3>
                  <i class="fas fa-box"></i> 
                  ${collect.item || collect.type}
                </h3>
                <p>
                  <i class="fas fa-weight"></i> 
                  <strong>Quantité:</strong> ${collect.quantity}
                </p>
                <p>
                  <i class="fas fa-map-marker-alt"></i> 
                  <strong>Lieu:</strong> ${collect.location || collect.place || "Non spécifié"}
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
};

export const showCollects = () => {
  document.getElementById("volunteers-section").classList.add("hidden");
  document.getElementById("collects-section").classList.remove("hidden");
  document.getElementById("btn-volunteers").classList.remove("active");
  document.getElementById("btn-collects").classList.add("active");
  loadCollects();
};

export const openCollectEditModalMore = async (id) => {
  const collect = collects.find((c) => c.id == id);
  if (!collect) return;
  const newQuantity = collect.quantity + 1;

  const ok = await updateCollect(id, { quantity: newQuantity });
  if (ok) {
    collect.quantity = newQuantity;
    applyCollectFilters();
  } else {
    showAlert("Échec de la mise à jour de la quantité", "error");
  }
};

export const openCollectEditModalLess = async (id) => {
  const collect = collects.find((c) => c.id == id);
  if (!collect || collect.quantity <= 0) return;
  const newQuantity = collect.quantity - 1;

  const ok = await updateCollect(id, { quantity: newQuantity });
  if (ok) {
    collect.quantity = newQuantity;
    applyCollectFilters();
  } else {
    showAlert("Échec de la mise à jour de la quantité", "error");
  }
};

// Wire shared UI controls only when collects section is visible
const searchEl = document.getElementById('search-input');
if (searchEl) {
  searchEl.addEventListener('input', () => {
    const colSection = document.getElementById('collects-section');
    if (!colSection || colSection.classList.contains('hidden')) return;
    applyCollectFilters();
  });
}

const applyBtn = document.getElementById('apply-filters');
if (applyBtn) {
  applyBtn.addEventListener('click', () => {
    const colSection = document.getElementById('collects-section');
    if (!colSection || colSection.classList.contains('hidden')) return;
    applyCollectFilters();
  });
}

const sortOrderBtn = document.getElementById('sort-order');
if (sortOrderBtn) {
  if (!sortOrderBtn.dataset.order) sortOrderBtn.dataset.order = 'desc';
  sortOrderBtn.addEventListener('click', () => {
    const colSection = document.getElementById('collects-section');
    if (!colSection || colSection.classList.contains('hidden')) return;
    const current = sortOrderBtn.dataset.order === 'asc' ? 'asc' : 'desc';
    const next = current === 'asc' ? 'desc' : 'asc';
    sortOrderBtn.dataset.order = next;
    const icon = sortOrderBtn.querySelector('i');
    if (icon) {
      icon.className = next === 'asc' ? 'fas fa-arrow-up-wide-short' : 'fas fa-arrow-down-wide-short';
    }
    applyCollectFilters();
  });
}

const clearBtn = document.getElementById('clear-filters');
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    const colSection = document.getElementById('collects-section');
    if (!colSection || colSection.classList.contains('hidden')) return;

    const si = document.getElementById('search-input');
    const ls = document.getElementById('filter-location');
    const df = document.getElementById('filter-date-from');
    const dt = document.getElementById('filter-date-to');
    const sb = document.getElementById('sort-by');
    const so = document.getElementById('sort-order');

    if (si) si.value = '';
    if (ls) ls.value = '';
    if (df) df.value = '';
    if (dt) dt.value = '';
    if (sb) sb.value = 'date';
    if (so) {
      so.dataset.order = 'desc';
      const icon = so.querySelector('i');
      if (icon) icon.className = 'fas fa-arrow-down-wide-short';
    }

    applyCollectFilters();
  });
}

export { loadCollects, createCollect, updateCollect, deleteCollect };
