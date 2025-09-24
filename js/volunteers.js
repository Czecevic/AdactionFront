import { fetchWithAuth } from './api.js';
import { showAlert, showLoading } from './ui.js';
import { volunteers, currentUser } from './state.js';

const isVolunteerUser = () => {
  return currentUser && currentUser.role === "volunteer";
}

const loadVolunteers = async () => {
    showLoading(true);
  
    try {
      const response = await fetchWithAuth(`/volunteers`);
  
      if (response.ok) {
        const data = await response.json();
        volunteers.length = 0;
        volunteers.push(...data);
      } else {
        throw new Error("Erreur lors du chargement");
      }
    } catch (error) {
      console.log("API non disponible, utilisation des données simulées");
      volunteers.length = 0;
      volunteers.push(
        {
          id: 1,
          firstname: "Marie",
          lastname: "Dubois",
          username: "marie.d",
          location: "Paris",
          points: 120,
        },
        {
          id: 2,
          firstname: "Jean",
          lastname: "Martin",
          username: "jean.m",
          location: "Lyon",
          points: 98,
        },
        {
          id: 3,
          firstname: "Sophie",
          lastname: "Bernard",
          username: "sophie.b",
          location: "Marseille",
          points: 85,
        },
      );
    }
  
    displayVolunteers();
    showLoading(false);
  }
  
const createVolunteer = async (volunteerData) => {
    if (isVolunteerUser()) {
      showAlert("Action non autorisée pour votre rôle", "error");
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
        showAlert("Bénévole créé avec succès !", "success");
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.message || "Erreur lors de la création");
      }
    } catch (error) {
      console.log("Mode simulé - Création du bénévole");
      const newId = Math.max(...volunteers.map((v) => v.id || 0)) + 1;
      const newVolunteer = { id: newId, ...volunteerData };
      volunteers.push(newVolunteer);
      showAlert("Bénévole créé avec succès (mode démo) !", "success");
      return true;
    }
  }
  
const updateVolunteer = async (id, volunteerData) => {
    if (isVolunteerUser()) {
      showAlert("Action non autorisée pour votre rôle", "error");
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
        if (index !== -1) {
          volunteers[index] = updatedVolunteer;
        }
        showAlert("Bénévole modifié avec succès !", "success");
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.message || "Erreur lors de la modification");
      }
    } catch (error) {
      console.log("Mode simulé - Modification du bénévole");
      const index = volunteers.findIndex((v) => v.id == id);
      if (index !== -1) {
        volunteers[index] = { ...volunteers[index], ...volunteerData };
        showAlert("Bénévole modifié avec succès (mode démo) !", "success");
        return true;
      }
    }
  
    return false;
  }
  
const deleteVolunteer = async (id) => {
    if (isVolunteerUser()) {
      showAlert("Action non autorisée pour votre rôle", "error");
      return;
    }
    try {
      const response = await fetchWithAuth(`/volunteers/${id}`, {
        method: "DELETE",
      });
  
      if (response.ok) {
        const idx = volunteers.findIndex((v) => v.id == id);
        if (idx !== -1) volunteers.splice(idx, 1);
        showAlert("Bénévole supprimé avec succès !", "success");
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.message || "Erreur lors de la suppression");
      }
    } catch (error) {
      console.log("Mode simulé - Suppression du bénévole");
      const idx = volunteers.findIndex((v) => v.id == id);
      if (idx !== -1) volunteers.splice(idx, 1);
      showAlert("Bénévole supprimé avec succès (mode démo) !", "success");
      return true;
    }
  }

export const displayVolunteers = () => {
const container = document.getElementById("volunteers-list");
const actionVisible = !isVolunteerUser();

if (volunteers.length === 0) {
    container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #6b7280;">
            <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
            <p style="font-size: 1.2rem;">Aucun bénévole trouvé</p>
            <p>Cliquez sur "Ajouter Bénévole" pour commencer</p>
            </div>
        `;
    return;
}

container.innerHTML = volunteers
    .map(
    (volunteer) => `
            <div class="data-card">
            <h3>
                <i class="fas fa-user"></i> 
                ${volunteer.firstname} ${volunteer.lastname}
            </h3>
            <p>
                <i class="fas fa-user-tag"></i> 
                <strong>Username:</strong> ${volunteer.username}
            </p>
            <p>
                <i class="fas fa-map-marker-alt"></i> 
                <strong>Location:</strong> ${
                volunteer.location || "Non spécifié"
                }
            </p>
            <p>
                <i class="fas fa-star"></i> 
                <strong>Points:</strong> ${volunteer.points || 0}
            </p>

            ${actionVisible ? `
                <div class="card-actions">
                <button class="btn btn-warning" onclick="openVolunteerEditModal(${volunteer.id})">
                <i class="fas fa-edit"></i> Modifier
                </button>
                <button class="btn btn-danger" onclick="confirmDeleteVolunteer(${volunteer.id})">
                    <i class="fas fa-trash"></i> Supprimer
                    </button>
                    </div>` 
                    : ""}
            </div>
        `
    )
    .join("");
}

export const showVolunteers = () => {
  if (isVolunteerUser()) {
    document.getElementById("btn-volunteers").classList.add("hidden");
    showAlert("Action non autorisée pour votre rôle", "error");
    return;
  }
  document.getElementById("volunteers-section").classList.remove("hidden");
  document.getElementById("collects-section").classList.add("hidden");
  document.getElementById("btn-volunteers").classList.add("active");
  document.getElementById("btn-collects").classList.remove("active");
  loadVolunteers();
}

export const openVolunteerModal = () => {
  document.getElementById("volunteer-modal-title").innerHTML =
    '<i class="fas fa-user-plus"></i> Ajouter Bénévole';
  document.getElementById("volunteerForm").reset();
  document.getElementById("volunteer-id").value = "";
  document.getElementById("volunteerModal").style.display = "block";
}

export const openVolunteerEditModal = (id) =>  {
  const volunteer = volunteers.find((v) => v.id == id);
  if (!volunteer) return;

  document.getElementById("volunteer-modal-title").innerHTML =
    '<i class="fas fa-user-edit"></i> Modifier Bénévole';

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
}

export { isVolunteerUser, loadVolunteers, createVolunteer, updateVolunteer, deleteVolunteer };