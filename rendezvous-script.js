// =====================================
// RENDEZVOUS-SCRIPT.JS
// =====================================

let rendezVous = JSON.parse(localStorage.getItem("rendezVous")) || [];

function sauvegarderRdv() {
    localStorage.setItem("rendezVous", JSON.stringify(rendezVous));
}

function formatDateFR(d) {
    return new Date(d).toLocaleDateString("fr-FR", { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });
}

function ajouterRendezVous() {
    const animal = document.getElementById("rdvAnimal").value.trim();
    const date = document.getElementById("rdvDate").value;
    const motif = document.getElementById("rdvMotif").value.trim();
    const lieu = document.getElementById("rdvLieu").value.trim();

    if (!animal || !date || !motif) {
        alert("Veuillez remplir au minimum : Animal, Date et Motif.");
        return;
    }

    rendezVous.push({
        id: Date.now(),
        animal: animal,
        date: date,
        motif: motif,
        lieu: lieu || "Non précisé"
    });

    sauvegarderRdv();
    afficherListeRendezVous();

    // Réinitialiser les champs
    document.getElementById("rdvAnimal").value = "";
    document.getElementById("rdvDate").value = "";
    document.getElementById("rdvMotif").value = "";
    document.getElementById("rdvLieu").value = "";

    alert("Rendez-vous ajouté avec succès !");
}

function afficherListeRendezVous() {
    const zone = document.getElementById("listeRendezVous");
    zone.innerHTML = "";

    // Trier par date (prochain en premier)
    rendezVous.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (rendezVous.length === 0) {
        zone.innerHTML = "<p class='info'>Aucun rendez-vous prévu pour le moment.</p>";
        return;
    }

    rendezVous.forEach((rdv, index) => {
        const div = document.createElement("div");
        div.className = "rdv-item";
        div.innerHTML = `
            <strong>${formatDateFR(rdv.date)}</strong><br>
            <strong>${rdv.animal}</strong> — ${rdv.motif}<br>
            ${rdv.lieu ? `<small>Lieu : ${rdv.lieu}</small>` : ''}
            <div style="margin-top:10px;">
                <button onclick="supprimerRdv(${index})" class="btn-secondaire" style="background:#e74c3c;">Supprimer</button>
            </div>
        `;
        zone.appendChild(div);
    });
}

window.supprimerRdv = function(index) {
    if (confirm("Supprimer ce rendez-vous ?")) {
        rendezVous.splice(index, 1);
        sauvegarderRdv();
        afficherListeRendezVous();
    }
};

function retourAccueil() {
    window.location.href = "index.html";
}

// ==================== INITIALISATION ====================
window.onload = function() {
    afficherListeRendezVous();
};
