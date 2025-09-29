import { fetchWithAuth } from "./api.js";
import { showAlert, showLoading } from "./ui.js";
import { volunteers, currentUser } from "./state.js";

/**
 * Check if the logged-in user has the "volunteer" role.
 * Volunteers cannot create, edit, or delete other volunteers.
 */
const isVolunteerUser = () => {
  return currentUser && currentUser.role === "volunteer";
};

/* -----------------------------
   Helpers
----------------------------- */

/**
 * Parse a string into a valid Date object.
 * Returns null if invalid.
 */
function parseDateInput(value) {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Extract the creation/registration date of a volunteer.
 * Handles different possible date property names.
 */
function getVolunteerDate(volunteer) {
  const dateValue =
    volunteer.createdAt || volunteer.date || volunteer.created_at;
  if (!dateValue) return null;
  const date = new Date(dateValue);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Populate the location filter dropdown dynamically
 * with unique volunteer locations.
 */
function populateLocationFilter() {
  const select = document.getElementById("filter-location");
  if (!select) return;

  // Extract unique, sorted locations
  const uniqueLocations = Array.from(
    new Set(volunteers.map((v) => (v.location || "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const currentValue = select.value;

  // Reset dropdown and insert options
  select.innerHTML =
    '<option value="">All locations</option>' +
    uniqueLocations
      .map((loc) => `<option value="${loc}">${loc}</option>`)
      .join("");

  // Preserve previous selection if still valid
  if (currentValue && uniqueLocations.includes(currentValue)) {
    select.value = currentValue;
  }
}

/**
 * Sort volunteers based on current selected criteria.
 */
function sortVolunteers(list) {
  const sortByEl = document.getElementById("sort-by");
  const sortOrderEl = document.getElementById("sort-order");
  const sortBy = sortByEl?.value || "date";
  const order = sortOrderEl?.dataset?.order === "asc" ? "asc" : "desc";
  const multiplier = order === "asc" ? 1 : -1;

  // Comparators
  const compareStrings = (a, b) =>
    a.localeCompare(b, "fr", { sensitivity: "base" }) * multiplier;
  const compareNumbers = (a, b) => ((a || 0) - (b || 0)) * multiplier;

  return [...list].sort((a, b) => {
    switch (sortBy) {
      case "location":
        return compareStrings(a.location || "", b.location || "");
      case "name": {
        const av = `${a.lastname || ""} ${a.firstname || ""}`.trim();
        const bv = `${b.lastname || ""} ${b.firstname || ""}`.trim();
        return compareStrings(av, bv);
      }
      case "points":
        return compareNumbers(Number(a.points || 0), Number(b.points || 0));
      case "date":
      default: {
        const ad = getVolunteerDate(a);
        const bd = getVolunteerDate(b);
        if (!ad && !bd) return 0;
        if (!ad) return 1; // nulls last
        if (!bd) return -1;
        return (ad.getTime() - bd.getTime()) * multiplier;
      }
    }
  });
}

/**
 * Apply active filters (search, location, date)
 * and refresh the volunteer list.
 */
function applyVolunteerFilters() {
  const searchInput = document.getElementById("search-input");
  const locationSelect = document.getElementById("filter-location");
  const dateFromInput = document.getElementById("filter-date-from");
  const dateToInput = document.getElementById("filter-date-to");

  const query = (searchInput?.value || "").trim().toLowerCase();
  const selectedLocation = (locationSelect?.value || "").trim().toLowerCase();
  const dateFrom = parseDateInput(dateFromInput?.value || "");
  const dateToRaw = parseDateInput(dateToInput?.value || "");
  const dateTo = dateToRaw
    ? new Date(
        dateToRaw.getFullYear(),
        dateToRaw.getMonth(),
        dateToRaw.getDate(),
        23,
        59,
        59,
        999
      )
    : null;

  // Apply filters
  const filtered = volunteers.filter((v) => {
    // Search by text
    if (query) {
      const haystack = `${v.firstname || ""} ${v.lastname || ""} ${
        v.username || ""
      } ${v.location || ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    // Filter by location
    if (selectedLocation) {
      const loc = (v.location || "").toLowerCase();
      if (loc !== selectedLocation) return false;
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      const d = getVolunteerDate(v);
      if (!d) return false;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
    }

    return true;
  });

  const sorted = sortVolunteers(filtered);
  displayVolunteers(sorted);
}

/* -----------------------------
   CRUD Operations
----------------------------- */

/**
 * Fetch all volunteers from API (or fallback mock data).
 */
const loadVolunteers = async () => {
  showLoading(true);
  try {
    const response = await fetchWithAuth(`/volunteers`);
    console.log(response);

    if (response.ok) {
      const data = await response.json();
      volunteers.length = 0;
      volunteers.push(...data);
    } else {
      throw new Error("Error loading volunteers");
    }
  } catch (error) {
    console.log("API unavailable, using mock data");

    volunteers.length = 0;
    volunteers.push(
      {
        id: 1,
        firstname: "Marie",
        lastname: "Dubois",
        username: "marie.d",
        location: "Paris",
        points: 120,
        createdAt: "2025-01-15",
      },
      {
        id: 2,
        firstname: "Jean",
        lastname: "Martin",
        username: "jean.m",
        location: "Lyon",
        points: 98,
        createdAt: "2025-03-02",
      },
      {
        id: 3,
        firstname: "Sophie",
        lastname: "Bernard",
        username: "sophie.b",
        location: "Marseille",
        points: 85,
        createdAt: "2024-12-08",
      }
    );
  }

  applyVolunteerFilters();
  populateLocationFilter();
  showLoading(false);
};

/**
 * Create a new volunteer.
 */
const createVolunteer = async (volunteerData) => {
  if (isVolunteerUser()) {
    showAlert("Not authorized for your role", "error");
    return;
  }

  try {
    const response = await fetchWithAuth(`/volunteers`, {
      method: "POST",
      body: JSON.stringify(volunteerData),
    });

    if (response.ok) {
      const newVolunteer = await response.json();
      volunteers.push(newVolunteer);
      showAlert("Volunteer created successfully!", "success");
      populateLocationFilter();
      applyVolunteerFilters();
      return true;
    } else {
      const error = await response.json();
      throw new Error(error.message || "Error creating volunteer");
    }
  } catch (error) {
    console.log("Demo mode - Creating volunteer");

    const newId = Math.max(...volunteers.map((v) => v.id || 0)) + 1;
    const newVolunteer = { id: newId, ...volunteerData };
    volunteers.push(newVolunteer);

    showAlert("Volunteer created successfully (demo)!", "success");
    populateLocationFilter();
    applyVolunteerFilters();
    return true;
  }
};

/**
 * Update an existing volunteer.
 */
const updateVolunteer = async (id, volunteerData) => {
  if (isVolunteerUser()) {
    showAlert("Not authorized for your role", "error");
    return;
  }

  try {
    const response = await fetchWithAuth(`/volunteers/${id}`, {
      method: "PUT",
      body: JSON.stringify(volunteerData),
    });

    if (response.ok) {
      const updatedVolunteer = await response.json();
      const index = volunteers.findIndex((v) => v.id == id);
      if (index !== -1) volunteers[index] = updatedVolunteer;

      showAlert("Volunteer updated successfully!", "success");
      populateLocationFilter();
      applyVolunteerFilters();
      return true;
    } else {
      const error = await response.json();
      throw new Error(error.message || "Error updating volunteer");
    }
  } catch (error) {
    console.log("Demo mode - Updating volunteer");

    const index = volunteers.findIndex((v) => v.id == id);
    if (index !== -1) {
      volunteers[index] = { ...volunteers[index], ...volunteerData };
      showAlert("Volunteer updated successfully (demo)!", "success");
      populateLocationFilter();
      applyVolunteerFilters();
      return true;
    }
  }

  return false;
};

/**
 * Delete a volunteer by ID.
 */
const deleteVolunteer = async (id) => {
  if (isVolunteerUser()) {
    showAlert("Not authorized for your role", "error");
    return;
  }

  try {
    const response = await fetchWithAuth(`/volunteers/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      const idx = volunteers.findIndex((v) => v.id == id);
      if (idx !== -1) volunteers.splice(idx, 1);

      showAlert("Volunteer deleted successfully!", "success");
      populateLocationFilter();
      applyVolunteerFilters();
      return true;
    } else {
      const error = await response.json();
      throw new Error(error.message || "Error deleting volunteer");
    }
  } catch (error) {
    console.log("Demo mode - Deleting volunteer");

    const idx = volunteers.findIndex((v) => v.id == id);
    if (idx !== -1) volunteers.splice(idx, 1);

    showAlert("Volunteer deleted successfully (demo)!", "success");
    populateLocationFilter();
    applyVolunteerFilters();
    return true;
  }
};

/* -----------------------------
   UI Rendering
----------------------------- */

/**
 * Render volunteers in the UI.
 */
export const displayVolunteers = (list = volunteers) => {
  const container = document.getElementById("volunteers-list");
  const actionVisible = !isVolunteerUser();

  if (list.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #6b7280;">
        <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
        <p style="font-size: 1.2rem;">No volunteers found</p>
        <p>Click "Add Volunteer" to get started</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list
    .map(
      (volunteer) => `
    <div class="data-card">
      <h3><i class="fas fa-user"></i> ${volunteer.firstname} ${
        volunteer.lastname
      }</h3>
      <p><i class="fas fa-user-tag"></i> <strong>Username:</strong> ${
        volunteer.username
      }</p>
      <p><i class="fas fa-map-marker-alt"></i> <strong>Location:</strong> ${
        volunteer.location || "Not specified"
      }</p>
      <p><i class="fas fa-star"></i> <strong>Points:</strong> ${
        volunteer.points || 0
      }</p>
      ${
        volunteer.createdAt
          ? `<p><i class="fas fa-calendar-alt"></i> <strong>Date:</strong> ${volunteer.createdAt}</p>`
          : ""
      }
      ${
        actionVisible
          ? `
        <div class="card-actions">
          <button class="btn btn-warning" onclick="openVolunteerEditModal(${volunteer.id})">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="btn btn-danger" onclick="confirmDeleteVolunteer(${volunteer.id})">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>`
          : ""
      }
    </div>
  `
    )
    .join("");
};

/**
 * Show the volunteers section and hide others.
 */
export const showVolunteers = () => {
  if (isVolunteerUser()) {
    document.getElementById("btn-volunteers").classList.add("hidden");
    showAlert("Not authorized for your role", "error");
    return;
  }
  document.getElementById("volunteers-section").classList.remove("hidden");
  document.getElementById("collects-section").classList.add("hidden");
  document.getElementById("btn-volunteers").classList.add("active");
  document.getElementById("btn-collects").classList.remove("active");
  loadVolunteers();
};

/**
 * Open modal to add a volunteer.
 */
export const openVolunteerModal = () => {
  document.getElementById("volunteer-modal-title").innerHTML =
    '<i class="fas fa-user-plus"></i> Add Volunteer';
  document.getElementById("volunteerForm").reset();
  document.getElementById("volunteer-id").value = "";
  document.getElementById("volunteerModal").style.display = "block";
};

export const closeVolunteerModal = () => {
  document.getElementById("volunteerModal").style.display = "none";
};

/**
 * Open modal to edit an existing volunteer.
 */
export const openVolunteerEditModal = (id) => {
  const volunteer = volunteers.find((v) => v.id == id);
  if (!volunteer) return;

  document.getElementById("volunteer-modal-title").innerHTML =
    '<i class="fas fa-user-edit"></i> Edit Volunteer';

  document.getElementById("volunteer-id").value = volunteer.id;
  document.getElementById("volunteer-firstname").value = volunteer.firstname;
  document.getElementById("volunteer-lastname").value = volunteer.lastname;
  document.getElementById("volunteer-username").value = volunteer.username;
  document.getElementById("volunteer-password").value =
    volunteer.password || "";
  document.getElementById("volunteer-location").value =
    volunteer.location || "";
  document.getElementById("volunteer-points").value = volunteer.points || 0;

  document.getElementById("volunteerModal").style.display = "block";
};

/* -----------------------------
   UI Event Listeners
----------------------------- */

// Live search
const searchInputEl = document.getElementById("search-input");
if (searchInputEl) {
  searchInputEl.addEventListener("input", () => {
    const volSection = document.getElementById("volunteers-section");
    if (!volSection || volSection.classList.contains("hidden")) return;
    applyVolunteerFilters();
  });
}

// Apply filters button
const applyBtnEl = document.getElementById("apply-filters");
if (applyBtnEl) {
  applyBtnEl.addEventListener("click", () => {
    const volSection = document.getElementById("volunteers-section");
    if (!volSection || volSection.classList.contains("hidden")) return;
    applyVolunteerFilters();
  });
}

// Toggle sort order
const sortOrderBtn = document.getElementById("sort-order");
if (sortOrderBtn) {
  if (!sortOrderBtn.dataset.order) sortOrderBtn.dataset.order = "desc";
  sortOrderBtn.addEventListener("click", () => {
    const volSection = document.getElementById("volunteers-section");
    if (!volSection || volSection.classList.contains("hidden")) return;
    const current = sortOrderBtn.dataset.order === "asc" ? "asc" : "desc";
    const next = current === "asc" ? "desc" : "asc";
    sortOrderBtn.dataset.order = next;
    const icon = sortOrderBtn.querySelector("i");
    if (icon) {
      icon.className =
        next === "asc"
          ? "fas fa-arrow-up-wide-short"
          : "fas fa-arrow-down-wide-short";
    }
    applyVolunteerFilters();
  });
}

// Clear/reset filters
const clearBtnEl = document.getElementById("clear-filters");
if (clearBtnEl) {
  clearBtnEl.addEventListener("click", () => {
    const volSection = document.getElementById("volunteers-section");
    if (!volSection || volSection.classList.contains("hidden")) return;

    const si = document.getElementById("search-input");
    const ls = document.getElementById("filter-location");
    const df = document.getElementById("filter-date-from");
    const dt = document.getElementById("filter-date-to");
    const sb = document.getElementById("sort-by");
    const so = document.getElementById("sort-order");

    if (si) si.value = "";
    if (ls) ls.value = "";
    if (df) df.value = "";
    if (dt) dt.value = "";
    if (sb) sb.value = "date";
    if (so) {
      so.dataset.order = "desc";
      const icon = so.querySelector("i");
      if (icon) icon.className = "fas fa-arrow-down-wide-short";
    }

    applyVolunteerFilters();
  });
}

export {
  isVolunteerUser,
  loadVolunteers,
  createVolunteer,
  updateVolunteer,
  deleteVolunteer,
};
