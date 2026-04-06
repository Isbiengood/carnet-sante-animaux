// =====================================
// AJOUT-SCRIPT.JS - Version renforcée (Compression photo + sécurité)
let animaux = JSON.parse(localStorage.getItem("animaux")) || [];
let photoBase64 = "";
let notesTemporaires = [];
let indexEdition = null;

// Sauvegarde sécurisée
function sauvegarder() {
    try {
        localStorage.setItem("animaux", JSON.stringify(animaux));
    } catch (e) {
        alert("Erreur : Mémoire insuffisante. La photo est peut-être trop lourde.\nEssayez avec une photo plus petite.");
        console.error("LocalStorage error:", e);
    }
}

// ==================== COMPRESSION PHOTO (plus forte) ====================
async function compresserPhoto(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                // Taille maximale encore plus réduite
                const maxSize = 600;
                if (width > height && width > maxSize) {
                    height = Math.round((height * maxSize) / width);
                    width = maxSize;
                } else if (height > maxSize) {
                    width = Math.round((width * maxSize) / height);
                    height = maxSize;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                // Qualité réduite à 0.65 pour plus de sécurité
                const compressed = canvas.toDataURL("image/jpeg", 0.65);
                resolve(compressed);
            };
            img.onerror = () => reject("Erreur de chargement de l'image");
            img.src = event.target.result;
        };
        reader.onerror = () => reject("Erreur de lecture du fichier");
        reader.readAsDataURL(file);
    });
}

// ==================== PHOTO ====================
function cacherApercuPhoto() {
    const container = document.getElementById("photoPreviewContainer");
    const preview = document.getElementById("photoPreview");
    if (container) container.classList.add("cache");
    if (preview) preview.src = "";
    photoBase64 = "";
}

document.getElementById("photoInput").onchange = async function(e) {
    let fichier = e.target.files[0];
    if (!fichier) return;

    // Vérification taille fichier brut
    if (fichier.size > 10 * 1024 * 1024) { // 10 Mo
        alert("La photo est trop lourde (max 10 Mo). Veuillez en choisir une plus petite.");
        return;
    }

    try {
        document.getElementById("photoPreview").src = ""; // reset
        photoBase64 = await compresserPhoto(fichier);

        const preview = document.getElementById("photoPreview");
        const container = document.getElementById("photoPreviewContainer");
        if (preview) preview.src = photoBase64;
        if (container) container.classList.remove("cache");

        console.log("Photo compressée avec succès - taille :", Math.round(photoBase64.length / 1024) + " Ko");
    } catch (err) {
        alert("Impossible de traiter la photo. Veuillez réessayer avec une autre photo.");
        console.error(err);
        cacherApercuPhoto();
    }
};

document.getElementById("btnSupprimerPhoto").onclick = cacherApercuPhoto;

// ==================== NOTES ====================
document.getElementById("btnAjouterNote").onclick = function() {
    let texte = document.getElementById("nouvelleNote").value.trim();
    if (!texte) return;

    let date = new Date().toISOString().split("T")[0];
    notesTemporaires.push({ date, texte });
    afficherHistoriqueNotes(notesTemporaires);
    document.getElementById("nouvelleNote").value = "";
};

function afficherHistoriqueNotes(notes) {
    let zone = document.getElementById("historiqueNotes");
    if (!zone) return;
    zone.innerHTML = "";

    if (!notes || notes.length === 0) {
        zone.innerHTML = "<p class='info'>Aucune note pour le moment.</p>";
        return;
    }

    notes.forEach((n, i) => {
        let div = document.createElement("div");
        div.className = "noteItem";
        div.innerHTML = `
            <strong>${formatDateFR(n.date)}</strong> — ${n.texte}
            <button onclick="supprimerNote(${i})" class="btn-supprimer-note">Supprimer</button>
        `;
        zone.appendChild(div);
    });
}

window.supprimerNote = function(index) {
    if (confirm("Supprimer cette note ?")) {
        notesTemporaires.splice(index, 1);
        afficherHistoriqueNotes(notesTemporaires);
    }
};

// ==================== CHARGEMENT MODE ÉDITION ====================
function chargerModeEdition() {
    const animalAEditer = JSON.parse(localStorage.getItem("animalAEditer"));
    if (!animalAEditer) {
        document.getElementById("titreFormulaire").textContent = "Ajouter un nouvel animal";
        document.getElementById("btnEnregistrer").textContent = "Enregistrer l'animal";
        return;
    }

    indexEdition = animaux.findIndex(a => 
        a.nom === animalAEditer.nom && a.dateNaissance === animalAEditer.dateNaissance
    );

    if (indexEdition === -1) {
        alert("Erreur : Animal à modifier introuvable.");
        window.location.href = "index.html";
        return;
    }

    const a = animalAEditer;

    document.getElementById("titreFormulaire").textContent = `Modifier ${a.nom}`;
    document.getElementById("btnEnregistrer").textContent = "Enregistrer les modifications";

    document.getElementById("nomInput").value = a.nom || "";
    document.getElementById("typeInput").value = a.type || "chien";
    document.getElementById("raceInput").value = a.race || "";
    document.getElementById("poidsInput").value = a.poids || "";

    if (a.dateNaissance && a.dateNaissance.endsWith("-01-01")) {
        document.getElementById("anneeInput").value = a.dateNaissance.substring(0, 4);
        document.getElementById("dateNaissanceInput").value = "";
    } else {
        document.getElementById("dateNaissanceInput").value = a.dateNaissance || "";
        document.getElementById("anneeInput").value = "";
    }

    document.getElementById("exterieurInput").checked = !!a.exterieur;

    if (a.photo) {
        photoBase64 = a.photo;
        document.getElementById("photoPreview").src = a.photo;
        document.getElementById("photoPreviewContainer").classList.remove("cache");
    } else {
        cacherApercuPhoto();
    }

    notesTemporaires = a.notes ? [...a.notes] : [];
    afficherHistoriqueNotes(notesTemporaires);

    // Vaccins et Soins
    document.getElementById("v_chp").value = a.v_chp || "";
    document.getElementById("v_pi").value = a.v_pi || "";
    document.getElementById("v_l").value = a.v_l || "";
    document.getElementById("v_rage_chien").value = a.v_rage_chien || "";
    document.getElementById("v_leish").value = a.v_leish || "";
    document.getElementById("v_piro").value = a.v_piro || "";
    document.getElementById("v_toux").value = a.v_toux || "";

    document.getElementById("v_typhus").value = a.v_typhus || "";
    document.getElementById("v_coryza").value = a.v_coryza || "";
    document.getElementById("v_leucose").value = a.v_leucose || "";
    document.getElementById("v_rage_chat").value = a.v_rage_chat || "";

    document.getElementById("s_toilettage").value = a.s_toilettage || "";
    document.getElementById("freq_toilettage").value = a.freq_toilettage || "3";
    document.getElementById("s_vermifuge").value = a.s_vermifuge || "";
    document.getElementById("s_antipuces").value = a.s_antipuces || "";

    document.getElementById("typeInput").dispatchEvent(new Event('change'));
};

// ==================== ENREGISTREMENT ====================
document.getElementById("btnEnregistrer").onclick = function() {
    let nomInput = document.getElementById("nomInput");
    if (!nomInput || !nomInput.value.trim()) {
        alert("Le nom de l’animal est obligatoire.");
        return;
    }

    let animal = {
        nom: nomInput.value.trim(),
        type: document.getElementById("typeInput").value,
        race: document.getElementById("raceInput").value.trim(),
        poids: document.getElementById("poidsInput").value,
        dateNaissance: document.getElementById("dateNaissanceInput").value || 
                      (document.getElementById("anneeInput").value ? 
                       document.getElementById("anneeInput").value + "-01-01" : ""),
        exterieur: document.getElementById("exterieurInput").checked,
        photo: photoBase64 || null,
        notes: notesTemporaires,

        v_chp: document.getElementById("v_chp").value,
        v_pi: document.getElementById("v_pi").value,
        v_l: document.getElementById("v_l").value,
        v_rage_chien: document.getElementById("v_rage_chien").value,
        v_leish: document.getElementById("v_leish").value,
        v_piro: document.getElementById("v_piro").value,
        v_toux: document.getElementById("v_toux").value,

        v_typhus: document.getElementById("v_typhus").value,
        v_coryza: document.getElementById("v_coryza").value,
        v_leucose: document.getElementById("v_leucose").value,
        v_rage_chat: document.getElementById("v_rage_chat").value,

        s_toilettage: document.getElementById("s_toilettage").value,
        freq_toilettage: parseInt(document.getElementById("freq_toilettage").value) || 3,
        s_vermifuge: document.getElementById("s_vermifuge").value,
        s_antipuces: document.getElementById("s_antipuces").value
    };

    if (indexEdition !== null) {
        animaux[indexEdition] = animal;
        localStorage.removeItem("animalAEditer");
        alert("Animal modifié avec succès !");
    } else {
        animaux.push(animal);
        alert("Animal ajouté avec succès !");
    }

    sauvegarder();
    window.location.href = "index.html";
};

// ==================== AFFICHAGE CHIEN / CHAT ====================
const typeInput = document.getElementById("typeInput");
if (typeInput) {
    typeInput.onchange = function() {
        let type = this.value;
        document.getElementById("vaccinsChien").classList.toggle("cache", type !== "chien");
        document.getElementById("vaccinsChat").classList.toggle("cache", type !== "chat");
        document.getElementById("toilettageBloc").classList.toggle("cache", type !== "chien");
        document.getElementById("labelExterieur").classList.toggle("cache", type !== "chat");
    };
}

// ==================== INITIALISATION ====================
window.onload = function() {
    chargerModeEdition();

    if (typeInput) typeInput.dispatchEvent(new Event('change'));

    const btnAnnuler = document.getElementById("btnAnnuler");
    if (btnAnnuler) {
        btnAnnuler.addEventListener("click", () => {
            localStorage.removeItem("animalAEditer");
            window.location.href = "index.html";
        });
    }
};
