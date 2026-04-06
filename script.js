// =====================================
// CARNET DE SANTÉ ANIMAUX - SCRIPT.JS (Version corrigée - Modifier + Fait aujourd'hui)
let animaux = [];
let filtreActuel = "chien";

let urgences = JSON.parse(localStorage.getItem("urgences")) || { 
    veto: "", 
    toiletteur: "" 
};

function chargerDonnees() {
    animaux = JSON.parse(localStorage.getItem("animaux")) || [];
}

function sauvegarder() {
    localStorage.setItem("animaux", JSON.stringify(animaux));
    localStorage.setItem("urgences", JSON.stringify(urgences));
}

// ==================== OUTILS DATES ====================
function formatDateFR(d) {
    if (!d) return "Non renseigné";
    return new Date(d).toLocaleDateString("fr-FR");
}

function afficherNaissance(dateNaissance) {
    if (!dateNaissance) return "Non renseigné";
    if (dateNaissance.endsWith("-01-01")) {
        return "Né en " + new Date(dateNaissance).getFullYear();
    }
    return "Né le " + formatDateFR(dateNaissance);
}

function calculAge(d) {
    if (!d) return "?";
    return new Date().getFullYear() - new Date(d).getFullYear();
}

function analyser(date, freq) {
    if (!date || !freq) return null;
    let today = new Date(); today.setHours(0,0,0,0);
    let lastDone = new Date(date);
    if (isNaN(lastDone.getTime())) return null;
    lastDone.setHours(0,0,0,0);
    let prochaine = new Date(lastDone);
    prochaine.setMonth(prochaine.getMonth() + parseInt(freq));
    let diffDays = Math.ceil((prochaine.getTime() - today.getTime()) / 86400000);
    return {
        prochaine,
        diff: diffDays > 0 ? diffDays : 0,
        retard: diffDays < 0 ? Math.abs(diffDays) : 0
    };
}

// ==================== FRÉQUENCES ====================
function getFrequenceVaccin(animal, vaccin) {
    let age = calculAge(animal.dateNaissance);
    if (animal.type === "chat") {
        if (age > 3) return vaccin === "rage" ? 36 : (animal.exterieur ? 12 : 36);
        return 12;
    }
    if (animal.type === "chien") {
        if (age > 1) return vaccin === "rage" ? 36 : 12;
        return 12;
    }
    return 12;
}

function getFrequenceSoin(animal, soin) {
    if (soin === "vermifuge") return 3;
    if (soin === "antipuces") return 1;
    if (soin === "toilettage") return animal.freq_toilettage || 3;
    return null;
}

// ==================== BLOC DATE ====================
function blocDate(label, date, freq, key, index) {
    if (!date) return `<p>${label} : Non renseigné</p>`;
    let analyse = analyser(date, freq);
    if (!analyse) return `<p>${label} : Non renseigné</p>`;

    let txt = `${label} : ${formatDateFR(analyse.prochaine)}`;
    if (analyse.retard > 0) {
        txt = `🔴 ${txt} (en retard de ${analyse.retard} jours)
               <button onclick="majAujourdHui(${index}, '${key}')" class="btn-principal petit">Fait aujourd'hui</button>`;
    } else if (analyse.diff <= 30) {
        txt = `🟡 ${txt} (dans ${analyse.diff} jours)`;
    } else {
        txt = `⚪ ${txt}`;
    }
    return `<p>${txt}</p>`;
}

// ==================== BANNÈRE ALERTES ====================
function verifierAlertesProchaines() {
    chargerDonnees();
    let alertes = [];

    animaux.forEach((animal, index) => {
        const estChien = animal.type === "chien";
        const vaccins = estChien ? [
            {label:"CHP", key:"v_chp", freq:12},
            {label:"Parvovirose (Pi)", key:"v_pi", freq:12},
            {label:"Leptospirose", key:"v_l", freq:12},
            {label:"Rage", key:"v_rage_chien", freq:getFrequenceVaccin(animal,"rage")},
            {label:"Leishmaniose", key:"v_leish", freq:12},
            {label:"Piroplasmose", key:"v_piro", freq:12},
            {label:"Toux du chenil", key:"v_toux", freq:12}
        ] : [
            {label:"Typhus", key:"v_typhus", freq:getFrequenceVaccin(animal,"typhus")},
            {label:"Coryza", key:"v_coryza", freq:getFrequenceVaccin(animal,"coryza")},
            {label:"Leucose", key:"v_leucose", freq:getFrequenceVaccin(animal,"leucose")},
            {label:"Rage", key:"v_rage_chat", freq:getFrequenceVaccin(animal,"rage")}
        ];

        alertes = alertes.concat(collecterAlertesAnimal(animal, index, vaccins));
        alertes = alertes.concat(collecterAlertesAnimal(animal, index, [
            {label:"Toilettage", key:"s_toilettage", freq:getFrequenceSoin(animal,"toilettage")},
            {label:"Vermifuge", key:"s_vermifuge", freq:getFrequenceSoin(animal,"vermifuge")},
            {label:"Anti-puces", key:"s_antipuces", freq:getFrequenceSoin(animal,"antipuces")}
        ]));
    });

    const banniere = document.getElementById("banniereAlertes");
    if (!banniere) return;

    if (alertes.length === 0) {
        banniere.classList.add("cache");
        return;
    }

    let message = `⚠️ ${alertes.length} rappel${alertes.length > 1 ? 's' : ''} : `;
    message += alertes.slice(0, 2).map(a => `${a.animal} (${a.label})`).join(" • ");
    if (alertes.length > 2) message += ` + ${alertes.length-2} autre${alertes.length-2>1?'s':''}`;

    document.getElementById("texteBanniere").textContent = message;
    document.getElementById("btnVoirAlertes").onclick = () => afficherDetailsAlertes(alertes);
    document.getElementById("btnFermerBanniere").onclick = () => banniere.classList.add("cache");

    banniere.classList.remove("cache");
}

function collecterAlertesAnimal(animal, indexAnimal, items) {
    let alertesAnimal = [];
    items.forEach(item => {
        if (!animal[item.key]) return;
        let analyse = analyser(animal[item.key], item.freq);
        if (!analyse) return;
        if (analyse.retard > 0 || (analyse.diff > 0 && analyse.diff <= 5)) {
            let statut = analyse.retard > 0 ? `🔴 EN RETARD (${analyse.retard}j)` : `🟡 Dans ${analyse.diff} jour${analyse.diff>1?'s':''}`;
            alertesAnimal.push({animal: animal.nom, index: indexAnimal, label: item.label, statut, key: item.key});
        }
    });
    return alertesAnimal;
}

function afficherDetailsAlertes(alertes) {
    let html = `<h3>📋 Alertes à venir / en retard</h3><div class="liste-alertes">`;
    alertes.forEach(al => {
        html += `
            <div class="alerte-item">
                <strong>${al.animal}</strong> — ${al.label}<br>
                <span class="statut ${al.statut.includes('RETARD') ? 'retard' : 'bientot'}">${al.statut}</span>
                <button onclick="marquerFaitDepuisBanniere(${al.index}, '${al.key}'); this.closest('.alerte-item').style.opacity='0.5'; this.disabled=true;" 
                        class="btn-principal petit">Marquer comme fait aujourd'hui</button>
            </div>`;
    });
    html += `</div><button onclick="this.closest('.modal-alertes').remove()" class="btn-secondaire">Fermer</button>`;

    let modal = document.createElement("div");
    modal.className = "modal-alertes";
    modal.innerHTML = `<div class="modal-overlay"><div class="modal-content">${html}</div></div>`;
    document.body.appendChild(modal);
}

window.marquerFaitDepuisBanniere = function(index, key) {
    let today = new Date().toISOString().split("T")[0];
    animaux[index][key] = today;
    sauvegarder();
    verifierAlertesProchaines();
};

// ==================== MAJ AUJOURD'HUI DANS FICHE ====================
window.majAujourdHui = function(index, key) {
    let today = new Date().toISOString().split("T")[0];
    animaux[index][key] = today;
    sauvegarder();
    verifierAlertesProchaines();

    // Recharge la fiche si on est dessus
    if (document.getElementById("ficheContent")) {
        chargerFiche();
    }
};

// ==================== GESTION NUMÉROS URGENCE ====================
function formatPhone(input) {
    let val = input.value.replace(/\D/g, '');
    if (val.length > 10) val = val.substring(0, 10);
    input.value = val.replace(/(\d{2})(?=\d)/g, '$1 ');
}

function updatePhoneUI() {
    const vetoInput = document.getElementById("urgenceVeto");
    const toiletteurInput = document.getElementById("urgenceToiletteur");
    const affVeto = document.getElementById("affichageVeto");
    const affToiletteur = document.getElementById("affichageToiletteur");

    if (urgences.veto) {
        vetoInput.value = urgences.veto;
        formatPhone(vetoInput);
        const numeroPropre = urgences.veto.replace(/\s/g, '');
        affVeto.innerHTML = `<a href="tel:${numeroPropre}" style="color:#d45a80; text-decoration:none;">${urgences.veto}</a>`;
        affVeto.classList.remove("cache");
        document.getElementById("btnVeto").textContent = "Modifier";
    } else {
        affVeto.classList.add("cache");
        document.getElementById("btnVeto").textContent = "Enregistrer";
    }

    if (urgences.toiletteur) {
        toiletteurInput.value = urgences.toiletteur;
        formatPhone(toiletteurInput);
        const numeroPropre = urgences.toiletteur.replace(/\s/g, '');
        affToiletteur.innerHTML = `<a href="tel:${numeroPropre}" style="color:#d45a80; text-decoration:none;">${urgences.toiletteur}</a>`;
        affToiletteur.classList.remove("cache");
        document.getElementById("btnToiletteur").textContent = "Modifier";
    } else {
        affToiletteur.classList.add("cache");
        document.getElementById("btnToiletteur").textContent = "Enregistrer";
    }
}

// ==================== AFFICHAGE LISTE ====================
function afficherListe(type) {
    chargerDonnees();
    const listeAnimaux = document.getElementById("listeAnimaux");
    if (!listeAnimaux) return;
    listeAnimaux.innerHTML = "";

    let filtres = animaux.filter(a => a.type === type);
    if (filtres.length === 0) {
        let li = document.createElement("li");
        li.textContent = "Aucun animal enregistré pour le moment.";
        li.style.fontStyle = "italic";
        li.style.color = "#777";
        listeAnimaux.appendChild(li);
        return;
    }

    filtres.forEach(a => {
        let idx = animaux.findIndex(anim => anim.nom === a.nom && anim.dateNaissance === a.dateNaissance);
        let li = document.createElement("li");
        li.textContent = a.nom;
        li.onclick = () => {
            localStorage.setItem("animalActuelIndex", idx);
            window.location.href = "fiche.html";
        };
        listeAnimaux.appendChild(li);
    });
}

// ==================== CHARGEMENT FICHE ====================
function chargerFiche() {
    chargerDonnees();
    const index = parseInt(localStorage.getItem("animalActuelIndex"));
    if (isNaN(index) || !animaux[index]) {
        document.getElementById("ficheContent").innerHTML = "<p style='color:red;text-align:center;padding:40px;'>Animal introuvable.</p>";
        return;
    }

    const a = animaux[index];
    const content = document.getElementById("ficheContent");

    let photoHTML = a.photo ? `<img src="${a.photo}" class="photoCarree" alt="${a.nom}">` : 
                               `<div class="photoCarree" style="background:#ddd;display:flex;align-items:center;justify-content:center;color:#777;">Pas de photo</div>`;

    let html = `
        <div class="ficheHeader">
            <div>${photoHTML}</div>
            <div>
                <h2>${a.nom}</h2>
                <p><strong>Type :</strong> ${a.type === "chien" ? "🐶 Chien" : "🐱 Chat"}</p>
                <p><strong>Race :</strong> ${a.race || "-"}</p>
                <p><strong>Poids :</strong> ${a.poids || "-"} kg</p>
                <p><strong>${afficherNaissance(a.dateNaissance)}</strong> (${calculAge(a.dateNaissance)} ans)</p>
                
                <div style="margin-top:25px;">
                    <button class="btn-principal" onclick="modifierDepuisFiche(${index})" style="margin-right:12px;">Modifier</button>
                    <button class="btn-secondaire" onclick="supprimerDepuisFiche(${index})">Supprimer</button>
                </div>
            </div>
        </div>

        <h3>Vaccins</h3>`;

    if (a.type === "chien") {
        html += blocDate("CHP", a.v_chp, 12, "v_chp", index);
        html += blocDate("Parvovirose (Pi)", a.v_pi, 12, "v_pi", index);
        html += blocDate("Leptospirose", a.v_l, 12, "v_l", index);
        html += blocDate("Rage", a.v_rage_chien, getFrequenceVaccin(a, "rage"), "v_rage_chien", index);
        html += blocDate("Leishmaniose", a.v_leish, 12, "v_leish", index);
        html += blocDate("Piroplasmose", a.v_piro, 12, "v_piro", index);
        html += blocDate("Toux du chenil", a.v_toux, 12, "v_toux", index);
    } else {
        html += blocDate("Typhus", a.v_typhus, getFrequenceVaccin(a, "typhus"), "v_typhus", index);
        html += blocDate("Coryza", a.v_coryza, getFrequenceVaccin(a, "coryza"), "v_coryza", index);
        html += blocDate("Leucose", a.v_leucose, getFrequenceVaccin(a, "leucose"), "v_leucose", index);
        html += blocDate("Rage", a.v_rage_chat, getFrequenceVaccin(a, "rage"), "v_rage_chat", index);
    }

    html += `
        <h3>Soins</h3>
        ${blocDate("Toilettage", a.s_toilettage, getFrequenceSoin(a, "toilettage"), "s_toilettage", index)}
        ${blocDate("Vermifuge", a.s_vermifuge, getFrequenceSoin(a, "vermifuge"), "s_vermifuge", index)}
        ${blocDate("Anti-puces", a.s_antipuces, getFrequenceSoin(a, "antipuces"), "s_antipuces", index)}

        <h3>Notes importantes</h3>
        <div id="historiqueNotesFiche"></div>`;

    content.innerHTML = html;
    afficherHistoriqueNotesFiche(a.notes || []);
}

function afficherHistoriqueNotesFiche(notes) {
    const zone = document.getElementById("historiqueNotesFiche");
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
            <button onclick="supprimerNoteFiche(${i})" class="btn-supprimer-note">Supprimer</button>
        `;
        zone.appendChild(div);
    });
}

window.supprimerNoteFiche = function(indexNote) {
    const indexAnimal = parseInt(localStorage.getItem("animalActuelIndex"));
    if (isNaN(indexAnimal) || !animaux[indexAnimal]) return;

    if (confirm("Supprimer cette note définitivement ?")) {
        animaux[indexAnimal].notes.splice(indexNote, 1);
        sauvegarder();
        chargerFiche();
    }
};

// ==================== MODIFIER ANIMAL ====================
window.modifierDepuisFiche = function(index) {
    if (!animaux[index]) {
        alert("Erreur : Animal introuvable.");
        return;
    }
    localStorage.setItem("animalAEditer", JSON.stringify(animaux[index]));
    window.location.href = "ajout.html";
};

window.supprimerDepuisFiche = function(index) {
    if (!confirm("Supprimer cet animal définitivement ?")) return;
    animaux.splice(index, 1);
    sauvegarder();
    window.location.href = "index.html";
};

function retourAccueil() {
    localStorage.removeItem("animalActuelIndex");
    window.location.href = "index.html";
}

// ==================== INITIALISATION ====================
window.onload = function () {
    chargerDonnees();

    if (document.getElementById("ficheContent")) {
        chargerFiche();
        return;
    }

    // Gestion numéros urgence
    const vetoInput = document.getElementById("urgenceVeto");
    const toiletteurInput = document.getElementById("urgenceToiletteur");

    if (vetoInput) {
        vetoInput.addEventListener("input", () => formatPhone(vetoInput));
        document.getElementById("btnVeto").onclick = () => {
            let val = vetoInput.value.replace(/\D/g, '');
            if (val.length === 10) {
                urgences.veto = val.replace(/(\d{2})(?=\d)/g, '$1 ');
                sauvegarder();
                updatePhoneUI();
            } else if (val.length > 0) {
                alert("Le numéro doit contenir exactement 10 chiffres.");
            }
        };
    }

    if (toiletteurInput) {
        toiletteurInput.addEventListener("input", () => formatPhone(toiletteurInput));
        document.getElementById("btnToiletteur").onclick = () => {
            let val = toiletteurInput.value.replace(/\D/g, '');
            if (val.length === 10) {
                urgences.toiletteur = val.replace(/(\d{2})(?=\d)/g, '$1 ');
                sauvegarder();
                updatePhoneUI();
            } else if (val.length > 0) {
                alert("Le numéro doit contenir exactement 10 chiffres.");
            }
        };
    }

    updatePhoneUI();

    // Onglets
    document.querySelectorAll(".onglet").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".onglet").forEach(b => b.classList.remove("actif"));
            btn.classList.add("actif");
            filtreActuel = btn.dataset.type;
            afficherListe(filtreActuel);
        });
    });

    document.getElementById("btnAjouter").addEventListener("click", () => {
        localStorage.removeItem("animalAEditer");
        window.location.href = "ajout.html";
    });

    verifierAlertesProchaines();
    afficherListe(filtreActuel);
};
