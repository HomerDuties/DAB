// =============================================================================
// dab-renderer.js — LE RENDU (couche d'affichage, découplé du PILOTE)
// =============================================================================
// Dans la couche « VUE » (cf. CLINE.md — les 3 couches), deux métiers se
// distinguent :
//
//   1. LE PILOTE (dab-controller.js) : le « quand » — il écoute les clics,
//      envoie les actions au requêteur (front-action-dealer.js), gère le
//      verrou « une requête à la fois », le démarrage et les erreurs réseau.
//      Il ne dessine jamais.
//   2. LE RENDU (CE FICHIER) : le « comment » — il reçoit un état et remplit
//      la page (message, options, comptes, reçu, clavier…). Aucun fetch,
//      aucun verrou, aucune décision métier.
//
// Le pilote installe ici le rappel « envoyerAction » via configurer() : quand
// l'utilisateur clique une option, le rendu ne fait que RELAYER
// (action, payload) vers le pilote — il ne connaît ni le réseau, ni la
// machine, ni le serveur.
//
// Étape 1 du découpage : l'ancien `afficher(etat)` de dab-ui.js a été déplacé
// ici tel quel. On affinera ensuite (injection du DOM, rendu purement
// testable) avec les tests.
// =============================================================================
(function (global) {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const les = {
    message: $("message"), erreur: $("erreur"), comptes: $("comptes"),
    options: $("options"), saisieEcran: $("saisieEcran"), saisieLibelle: $("saisieLibelle"),
    saisieValeur: $("saisieValeur"), recu: $("recu"), pave: $("pave"),
    phase: $("phase"), horloge: $("horloge"),
    carteBanner: $("carteBanner"), carteInfo: $("carteInfo"),
    cartePhysique: $("cartePhysique"), led: $("led"),
    btnValider: $("btnValider"),
  };

  const DABRenderer = {
    // Le rappel installé par le pilote : un clic d'option est relayé vers
    // `envoyer(action, payload)` — le rendu ne sait que relayer.
    envoyerAction: null,
    configurer(rappel) {
      this.envoyerAction = rappel;
    },

    // -------------------------------------------------------------------------
    // LE CŒUR : un état JSON → la page remplie. Aucun fetch, aucun verrou.
    // -------------------------------------------------------------------------
    afficher(etat) {
      debugger; // ⑨ (RETOUR) — le NOUVEL état revient du core : on le dessine.
      // ↑ Inspecte `etat` : message, options, comptes, saisie, recu…
      //   = l'écran suivant.
      document.title = "DAB 406 — " + (etat.screen || "écran");
      les.phase.textContent = (etat.screen || "").replace(/_/g, " ") || "—";

      // message principal (celui du core)
      les.message.textContent = etat.message || "";
      les.message.classList.toggle("accueil", etat.screen === "accueil");

      // refus / erreur → bandeau rouge à l'écran
      les.erreur.hidden = !etat.erreur;
      les.erreur.textContent = etat.erreur ? "⛔ " + etat.erreur : "";

      // carte insérée dans le sas (numéro masqué fourni par le core)
      if (etat.carte) {
        les.carteInfo.innerHTML = "Carte de <b>" + etat.carte.proprietaire +
          "</b> · <span class='no'>" + etat.carte.numero + "</span>";
        les.carteBanner.hidden = false;
        les.cartePhysique.classList.add("enfoncee");
        les.led.classList.add("allumee");
      } else {
        les.carteBanner.hidden = true;
        les.cartePhysique.classList.remove("enfoncee");
        les.led.classList.remove("allumee");
      }

      // comptes du client authentifié (avec leurs vrais soldes)
      les.comptes.innerHTML = "";
      for (const c of etat.comptes || []) {
        const div = document.createElement("div");
        div.className = "compte";
        div.innerHTML = "<div class='nom'>" + c.label + "</div>" +
          "<div class='solde'>" + c.solde.toLocaleString("fr-FR") + " €</div>";
        les.comptes.appendChild(div);
      }

      // saisie en cours : le PIN est masqué, le montant s'affiche en clair
      let saisie = etat.saisie || "";
      if (etat.typeSaisie === "pin") saisie = "•".repeat(saisie.length);
      if (etat.typeSaisie === "montant" && saisie) saisie += " €";
      if (etat.screen === "saisie_code") {
        les.saisieLibelle.textContent = "Entrez votre code secret";
        les.saisieValeur.textContent = saisie || "— · — · — · —";
        les.saisieEcran.hidden = false;
      } else if (etat.typeSaisie === "montant") {
        les.saisieLibelle.textContent = "Montant";
        les.saisieValeur.textContent = saisie || "——— €";
        les.saisieEcran.hidden = false;
      } else {
        les.saisieEcran.hidden = true;
      }

      // options de l'état → boutons (le rendu ne fait que relayer action+payload)
      les.options.innerHTML = "";
      for (const opt of etat.options || []) {
        const b = document.createElement("button");
        b.textContent = opt.label;
        if (opt.action === "insererCarte") b.className = "opt-carte";
        else if (["continuer", "rendreCarte", "annuler"].includes(opt.action)) b.className = "opt-retour";
        // Le clic remonte vers le pilote via `envoyerAction` : le rendu ne
        // connaît ni le réseau ni la machine — il ne sait que relayer.
        b.addEventListener("click", () => this.envoyerAction && this.envoyerAction(opt.action, opt.payload));
        les.options.appendChild(b);
      }

      // reçu de l'opération → petit ticket
      if (etat.recu) {
        les.recu.innerHTML =
          "<div class='perfo'></div><div class='entete'>" + etat.recu.entete + "</div>" +
          (etat.recu.lignes || []).map((l) =>
            "<div class='ligne'><span>" + l.label + "</span><span>" + (l.valeur ?? "") + "</span></div>"
          ).join("") +
          "<div class='fin'>Merci de votre confiance</div>";
        les.recu.hidden = false;
      } else {
        les.recu.hidden = true;
      }

      // clavier physique : proposé uniquement quand le core le demande
      les.pave.classList.toggle("affiche", !!etat.paveNumerique);
      les.btnValider.textContent = etat.validerLabel || "VALIDER";
    },

    // -------------------------------------------------------------------------
    // Verrou d'affichage : désactive/active les boutons pendant une requête
    // (évite le double-clic). C'est un geste visuel → vit dans le rendu.
    // -------------------------------------------------------------------------
    definirOccupe(occupe) {
      document.querySelectorAll("button").forEach((el) => { el.disabled = occupe; });
    },

    // -------------------------------------------------------------------------
    // Petite horloge décorative (le format d'écriture sur l'écran LCD).
    // -------------------------------------------------------------------------
    afficherHorloge(date) {
      const hh = String(date.getHours()).padStart(2, "0");
      const mm = String(date.getMinutes()).padStart(2, "0");
      les.horloge.textContent = hh + ":" + mm;
    },
  };

  global.DABRenderer = DABRenderer;
})(window);
