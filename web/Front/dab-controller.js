// =============================================================================
// dab-controller.js — LE PILOTE DU FRONT (renommé depuis dab-ui.js)
// =============================================================================
// Dans la couche « VUE » (cf. CLINE.md — les 3 couches), le pilote s'occupe du
// « QUAND » :
//   - il ÉCOUTE les clics (touches du pavé, valider, annuler, réinitialiser) ;
//   - il ENVOIE les actions au requêteur (front-action-dealer.js, le SEUL qui
//     fait les fetch) ;
//   - il GÈRE le verrou « une requête à la fois » (occupe) et le démarrage /
//     les erreurs réseau (« Serveur injoignable. »).
//
// Il ne DESSINE jamais : tout le « comment » (état → HTML) vit dans le rendu
// (dab-renderer.js). D'où ce découpage en 2 fichiers du front :
//   front-action-dealer.js   → le REQUÊTEUR : les échanges HTTP (agir/etat/reset)
//   dab-renderer.js          → le RENDU : un état reçu → la page (aucun réseau)
//   dab-controller.js (CE FICHIER) → le PILOTE : écoute, envoie, verrouille
//
// Étape 1 du découpage : ce fichier ne garde que le pilote ; l'ancien
// `afficher(etat)` a été déplacé vers DABRenderer.afficher(etat).
// =============================================================================
(function () {
  "use strict";

  // Le pilote « branche » le rendu : tout clic d'option remontera ici, dans
  // `envoyer(action, payload)` — le rendu, lui, ne connaît ni le réseau ni la
  // machine.
  DABRenderer.configurer((action, payload) => envoyer(action, payload));

  const $ = (id) => document.getElementById(id);
  let occupe = false; // verrou : une seule requête à la fois

  // ---------- 1. envoyer une action → réafficher l'état reçu ----------
  async function envoyer(action, payload) {
    if (occupe) return;
    occupe = true; DABRenderer.definirOccupe(true);
    try {
      debugger; // ① (ALLER) — Un clic sur l'écran a produit { action, payload }.
      // ↑ Inspecte `action` (ex. "chiffre") et `payload` (ex. { chiffre: "4" }),
      //   puis F10 pour suivre le geste jusqu'à FrontActionDealer.transmettre() .
      DABRenderer.afficher(await FrontActionDealer.transmettre(action, payload));
    } catch (e) {
      DABRenderer.afficher({ message: "Serveur injoignable.", erreur: String(e) });
    } finally {
      occupe = false; DABRenderer.definirOccupe(false);
    }
  }

  // ---------- 2. les touches physiques du boîtier ----------
  document.querySelectorAll(".touche[data-chiffre]").forEach((b) => {
    b.addEventListener("click", () => envoyer("chiffre", { chiffre: b.dataset.chiffre }));
  });
  $("toucheEffacer").addEventListener("click", () => envoyer("effacer"));
  $("btnValider").addEventListener("click", () => envoyer("valider"));
  $("btnAnnuler").addEventListener("click", () => envoyer("annuler"));

  // bouton discret « ↺ réinitialiser » : on redemande un nouvel état au
  // moteur (soldes et carte repartent de zéro) avant de réafficher.
  $("lienReset").addEventListener("click", async function (e) {
    e.preventDefault();
    if (occupe) return;
    occupe = true; DABRenderer.definirOccupe(true);
    try { DABRenderer.afficher(await FrontActionDealer.reinitialiser()); }
    catch (err) { DABRenderer.afficher({ message: "Réinitialisation impossible", erreur: String(err) }); }
    finally { occupe = false; DABRenderer.definirOccupe(false); }
  });

  // ---------- 3. une petite horloge décorative ----------
  setInterval(() => DABRenderer.afficherHorloge(new Date()), 1000);
  DABRenderer.afficherHorloge(new Date());

  // ---------- 4. démarrage : lire l'état courant et l'afficher ----------
  (async function () {
    try {
      DABRenderer.afficher(await FrontActionDealer.obtenirEtat());
    } catch (e) {
      DABRenderer.afficher({ message: "Connexion au serveur impossible", erreur: String(e) });
    }
  })();
})();
