// =============================================================================
// FabriqueInfoClientSource — FABRIQUE : choix de la source d'infos client
// =============================================================================
// Décision d'architecture actée (Client.js, 21/09/2026) :
//   « si la source devait varier un jour, on introduira une FABRIQUE plutôt
//   que d'injecter le flux. » → cette classe TIENT cette promesse.
//
// CONTRAT SOURCE (auquel toute source doit se conformer) :
//   toute source expose `trouverParId(id) -> InfoClient` et LÈVE une erreur
//   explicite si l'id est inconnu. Deux implémentations aujourd'hui :
//     - InfoClientSource        : lit clients.json (source de production)
//     - InfoClientSourceMemoire : données injectées en mémoire (tests, démo)
//
// Rôle dans la gestion fine des paramètres :
//   La fabrique est le SEUL endroit qui connaît le CHOIX de la source.
//   Le « type » est une VALEUR D'ENVIRONNEMENT / configuration (défaut :
//   "fichier"), pas une donnée d'opération : on ne le repasse pas à chaque
//   Client — le Client l'internalise et n'a pas conscience de la source.
// =============================================================================

const InfoClientSource = require("./InfoClientSource.js");
const InfoClientSourceMemoire = require("./InfoClientSourceMemoire.js");

class FabriqueInfoClientSource {
  constructor({ type = "fichier", chemin, stockage, donnees } = {}) {
    this.type = type;        // "fichier" (défaut) | "memoire"
    this.chemin = chemin;    // config → transmise à la source fichier
    this.stockage = stockage; // config → transmise à la source fichier
    this.donnees = donnees;   // config → transmise à la source mémoire
  }

  // Retourne UNE source prête à l'emploi, conforme au CONTRAT SOURCE.
  creer() {
    if (this.type === "memoire") {
      return new InfoClientSourceMemoire({ donnees: this.donnees });
    }
    // Défaut : fichier clients.json → comportement historique inchangé.
    return new InfoClientSource({ chemin: this.chemin, stockage: this.stockage });
  }
}

module.exports = FabriqueInfoClientSource;
