// =============================================================================
// front-action-dealer.js — LE REQUÊTEUR DU FRONT (côté navigateur)
// =============================================================================
// C'est le SEUL fichier du front qui « parle » au réseau : il encapsule le
// contrat agir / état décrit dans web/README.md, exactement comme le ferait un
// pilote de tests (cf. web/test-core-manager.js), mais à travers HTTP :
//
//     VUE (dab-ui.js) ── FrontActionDealer.transmettre(action, payload) ──▶ serveur ──▶ CoreManager
//            ▲                                                                       │
//            └───────── FrontActionDealer.obtenirEtat() ◀── état JSON ◀──────────────────┘
//
// AUCUN DOM ici : ce fichier ne connaît pas la page. Il transmet { action,
// payload } et renvoie l'état produit à l'UI, qui se charge de le dessiner.
//
// SÉPARATION DES FICHIERS DE LA VUE (pour l'apprentissage) :
//   index.html ……………… la structure du distributeur (aucune logique)
//   dab.css …………………… tous les styles
//   front-action-dealer.js … CE fichier → les échanges HTTP avec CoreManager (requêteur)
//   dab-ui.js ………………… le dessin : un état reçu → affiché (aucun réseau)
// =============================================================================
(function (global) {
  "use strict";

  // Le contrat du serveur (cf. web/server.js) :
  //   GET  /api/etat   → l'état actuel de l'appli
  //   POST /api/agir   → { action, payload } → le NOUVEL état
  //   POST /api/reset  → remet l'appli à zéro (soldes + carte repartent de zéro)
  const ETAT_URL  = "/api/etat";
  const AGIR_URL  = "/api/agir";
  const RESET_URL = "/api/reset";

  async function jsonOuErreur(reponse) {
    if (!reponse.ok) throw new Error("Réponse du serveur : " + reponse.status);
    debugger; // ⑧ (RETOUR) — l'état JSON renvoyé par le serveur arrive ici.
    // ↑ `reponse` = la réponse HTTP du POST ; la ligne suivante re-décode le JSON
    //   en objet pour l'UI : c'est LE NOUVEL ÉTAT DE L'APPLI.
    return reponse.json();
  }

  const FrontActionDealer = {
    // L'état actuel de l'appli (utile au chargement de la page).
    obtenirEtat() {
      return fetch(ETAT_URL).then(jsonOuErreur);
    },

    // Traduit l'action de l'utilisateur en requête HTTP et renvoie l'état
    // actuel de l'appli — la vue n'a qu'à le réafficher.
    transmettre(action, payload) {
      debugger; // ② (ALLER) — le « requêteur » prépare la requête HTTP vers le serveur.
      // ↑ Inspecte `action`/`payload`, puis passe (F10) : c'est le POST /api/agir
      //   qui transporte le geste jusqu'au serveur (web/server.js).
      return fetch(AGIR_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload: payload || {} }),
      }).then(jsonOuErreur);
    },

    // Remet l'appli dans son état d'origine (utile pour rejouer une démo).
    reinitialiser() {
      return fetch(RESET_URL, { method: "POST" }).then(jsonOuErreur);
    },
  };

  global.FrontActionDealer = FrontActionDealer;
})(window);
