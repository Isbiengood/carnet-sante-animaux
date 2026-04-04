// =====================================
// CARNET DE SANTÉ ANIMAUX - SCRIPT.JS (Version finale corrigée)
// =====================================

let animaux = JSON.parse(localStorage.getItem("animaux")) || [];
let indexEdition = null;
let filtreActuel = "chien";

let urgences = JSON.parse(localStorage.getItem("urgences")) || { 
    veto: "", 
    toiletteur: "" 
};

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

// ==================== ANALYSE DATES ====================
function analyser(date, freq) {
    if (!date || !freq) return null;

    let today = new Date();
    today.setHours(0, 0, 0, 0);

    let base = new Date(date);
    base.setHours(0, 0, 0, 0);

    let prochaine = new Date(base);
    const freqNum = parseInt(freq);

    while (prochaine <= today) {
        prochaine.setMonth(prochaine.getMonth() + freqNum);
    }

    let diff = Math.ceil((prochaine - today) / 86400000);
    let retard = diff < 0 ? Math.abs(diff) : 0;

    return { prochaine, diff: Math.max(0, diff), retard };
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

// ==================== FORMAT TÉLÉPHONE ====================
function formatPhone(input) {
    let val = input.value.replace(/\D/g, '');
    if (val.length > 10) val = val.substring(0, 10);
    input.value = val.replace(/(\d{2})(?=\d)/g, '$1 ');
}

// ==================== BLOC DATE POUR FICHE ====================
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
    let alertes = [];

    animaux.forEach((animal, index) => {
        const estChien = animal.type === "chien";

        const vaccins = estChien ? [
            { label: "CHP", key: "v_chp", freq: 12 },
            { label: "Parvovirose (Pi)", key: "v_pi", freq: 12 },
            { label: "Leptospirose", key: "v_l", freq: 12 },
            { label: "Rage", key: "v_rage_chien", freq: getFrequenceVaccin(animal, "rage") },
            { label: "Leishmaniose", key: "v_leish", freq: 12 },
            { label: "Piroplasmose", key: "v_piro", freq: 12 },
            { label: "Toux du chenil", key: "v_toux", freq: 12 }
        ] : [
            { label: "Typhus", key: "v_typhus", freq: getFrequenceVaccin(animal, "typhus") },
            { label: "Coryza", key: "v_coryza", freq: getFrequenceVaccin(animal, "coryza") },
            { label: "Leucose", key: "v_leucose", freq: getFrequenceVaccin(animal, "leucose") },
            { label: "Rage", key: "v_rage_chat", freq: getFrequenceVaccin(animal, "rage") }
        ];

        alertes = alertes.concat(collecterAlertesAnimal(animal, index, vaccins));

        alertes = alertes.concat(collecterAlertesAnimal(animal, index, [
            { label: "Toilettage", key: "s_toilettage", freq: getFrequenceSoin(animal, "toilettage") },
            { label: "Vermifuge", key: "s_vermifuge", freq: getFrequenceSoin(animal, "vermifuge") },
            { label: "Anti-puces", key: "s_antipuces", freq: getFrequenceSoin(animal, "antipuces") }
        ]));
    });

    const banniere = document.getElementById("banniereAlertes");
    if (!banniere) return;

    if (alertes.length === 0) {
        banniere.classList.add("cache");
        return;
    }

    let message = `⚠️ ${alertes.length} rappel${alertes.length > 1 ? 's' : ''} important${alertes.length > 1 ? 's' : ''} : `;
    message += alertes.slice(0, 2).map(a => `${a.animal} (${a.label})`).join(" • ");
    if (alertes.length > 2) message += ` + ${alertes.length - 2} autre${alertes.length - 2 > 1 ? 's' : ''}`;

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
            let statut = analyse.retard > 0 
                ? `🔴 EN RETARD (${analyse.retard}j)` 
                : `🟡 Dans ${analyse.diff} jour${analyse.diff > 1 ? 's' : ''}`;

            alertesAnimal.push({
                animal: animal.nom,
                type: animal.type,
                index: indexAnimal,
                label: item.label,
                dateProchaine: formatDateFR(analyse.prochaine),
                statut: statut,
                key: item.key
            });
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
                <small>Prochaine : ${al.dateProchaine}</small><br>
                <span class="statut ${al.statut.includes('RETARD') ? 'retard' : 'bientot'}">${al.statut}</span>
                <button onclick="marquerFaitDepuisBanniere(${al.index}, '${al.key}'); this.closest('.alerte-item').style.opacity='0.5'; this.disabled=true;" 
                        class="btn-principal petit">Fait aujourd'hui</button>
            </div>`;
    });
    html += `</div><button onclick="this.closest('.modal-alertes').remove()" class="btn-secondaire" style="margin-top:15px;">Fermer</button>`;

    let modal = document.createElement("div");
    modal.className = "modal-alertes";
    modal.innerHTML = `<div class="modal-overlay"><div class="modal-content">${html}</div></div>`;
    document.body.appendChild(modal);
}

window.marquerFaitDepuisBanniere = function(index, key) {
    animaux[index][key] = new Date().toISOString().split("T")[0];
    sauvegarder();
    afficherListe(filtreActuel);
    verifierAlertesProchaines();

    const fiche = document.getElementById("ficheAnimal");
    if (!fiche.classList.contains("cache")) {
        afficherFiche(animaux[index], index);
    }
};

// ==================== LISTE & FICHE ====================
function afficherListe(type) {
    const listeAnimaux = document.getElementById("listeAnimaux");
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
        let idx = animaux.findIndex(anim => anim === a);
        let li = document.createElement("li");
        li.textContent = a.nom;
        li.onclick = () => afficherFiche(a, idx);
        listeAnimaux.appendChild(li);
    });
}

function afficherFiche(a, index) {
    const fiche = document.getElementById("ficheAnimal");
    fiche.classList.remove("cache");

    // Photo entière sans rognage (version corrigée)
    let photoHTML = a.photo ? 
        `<img src="${a.photo}" class="photoCarree" alt="${a.nom}">` : 
        `<div class="photoCarree" style="background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:#777;padding:30px;">Pas de photo</div>`;

    let html = `
        <div class="ficheHeader">
            <div>${photoHTML}</div>
            <div>
                <h2>${a.nom}</h2>
                <p><strong>Type :</strong> ${a.type === "chien" ? "🐶 Chien" : "🐱 Chat"}</p>
                <p><strong>Race :</strong> ${a.race || "-"}</p>
                <p><strong>Poids :</strong> ${a.poids || "-"} kg</p>
                <p><strong>${afficherNaissance(a.dateNaissance)}</strong> (${calculAge(a.dateNaissance)} ans)</p>
                
                <div style="margin-top: 15px;">
                    <button class="btn-principal" onclick="modifierAnimal(${index})" style="margin-right: 8px;">Modifier</button>
                    <button class="btn-secondaire" onclick="supprimerAnimal(${index})">Supprimer</button>
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

    fiche.innerHTML = html;
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

    notes.forEach(n => {
        let div = document.createElement("div");
        div.className = "noteItem";
        div.innerHTML = `<strong>${formatDateFR(n.date)}</strong> — ${n.texte}`;
        zone.appendChild(div);
    });
}

window.majAujourdHui = function(index, key) {
    animaux[index][key] = new Date().toISOString().split("T")[0];
    sauvegarder();
    afficherFiche(animaux[index], index);
    verifierAlertesProchaines();
};

// ==================== MODIFIER & SUPPRIMER ====================
window.modifierAnimal = function(index) {
    localStorage.setItem("animalAEditer", JSON.stringify(animaux[index]));
    window.location.href = "ajout.html";
};

window.supprimerAnimal = function(index) {
    if (!confirm("Supprimer cet animal définitivement ?")) return;
    animaux.splice(index, 1);
    sauvegarder();
    document.getElementById("ficheAnimal").classList.add("cache");
    afficherListe(filtreActuel);
    verifierAlertesProchaines();
};

// ==================== INITIALISATION ====================
window.onload = function () {

    // Téléphones urgences
    const vetoInput = document.getElementById("urgenceVeto");
    const toiletteurInput = document.getElementById("urgenceToiletteur");

    function updatePhoneUI() {
        if (vetoInput) {
            vetoInput.value = urgences.veto || "";
            formatPhone(vetoInput);
            document.getElementById("btnVeto").onclick = () => {
                if (vetoInput.value.trim()) {
                    urgences.veto = vetoInput.value;
                    sauvegarder();
                    updatePhoneUI();
                }
            };
        }
        if (toiletteurInput) {
            toiletteurInput.value = urgences.toiletteur || "";
            formatPhone(toiletteurInput);
            document.getElementById("btnToiletteur").onclick = () => {
                if (toiletteurInput.value.trim()) {
                    urgences.toiletteur = toiletteurInput.value;
                    sauvegarder();
                    updatePhoneUI();
                }
            };
        }
    }

    if (vetoInput) vetoInput.addEventListener("input", () => formatPhone(vetoInput));
    if (toiletteurInput) toiletteurInput.addEventListener("input", () => formatPhone(toiletteurInput));
    updatePhoneUI();

    // Gestion des onglets
    document.querySelectorAll(".onglet").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".onglet").forEach(b => b.classList.remove("actif"));
            btn.classList.add("actif");
            filtreActuel = btn.dataset.type;
            afficherListe(filtreActuel);
        });
    });

    // Bouton Ajouter
    document.getElementById("btnAjouter").addEventListener("click", () => {
        localStorage.removeItem("animalAEditer");
        window.location.href = "ajout.html";
    });

    // Lancement
    verifierAlertesProchaines();
    afficherListe(filtreActuel);
};