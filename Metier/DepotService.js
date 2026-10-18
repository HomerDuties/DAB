// =============================================================================
// DepotService — Classe MÉTIER (opération de dépôt d'espèces)
// =============================================================================
// Responsabilité unique : orchestrer le dépôt sur un compte.
//
// SIMPLE : ce service ne manipule QU'UN SEUL objet Compte (aucune donnée
// à faire circuler entre plusieurs objets, aucun état partagé).
//
// Il valide le montant puis DÉLÈGUE la mutation au compte (crediter),
// car modifier le solde est la responsabilité du compte lui-même.
//
// Gestion fine des paramètres :
//   - Constructeur vide (service sans état)
//   - Méthode deposer(montant, compte) : données variables par appel
// =============================================================================

class DepotService {
  constructor() {
    // Orchestrateur stateless : aucun état propre.
  }

  deposer(montant, compte) {
    if (montant <= 0) {
      throw new Error("Montant de dépot invalide.");
    }
    compte.crediter(montant); // la mutation est déléguée au compte
  }
}

module.exports = DepotService;