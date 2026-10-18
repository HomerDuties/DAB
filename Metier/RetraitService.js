// =============================================================================
// RetraitService — Classe MÉTIER (opération de retrait d'espèces)
// =============================================================================
// Responsabilité unique : orchestrer un retrait depuis un compte.
//
// SIMPLE : ce service ne manipule QU'UN SEUL objet Compte (aucune donnée
// à faire circuler entre plusieurs objets, aucun état partagé).
//
// Étapes (dans l'ordre) :
//   1. valider le montant
//   2. vérifier que le compte peut couvrir
//   3. DÉLÈGUER la mutation au compte (debiter)
//
// Gestion fine des paramètres :
//   - Constructeur vide (service sans état)
//   - Méthode retirer(montant, compte) : données variables par appel
// =============================================================================

class RetraitService {
  constructor() {
    // Orchestrateur stateless : aucun état propre.
  }

  retirer(montant, compte) {
    if (montant <= 0) {
      throw new Error("Montant de retrait invalide.");
    }
    if (!compte.peutCouvrir(montant)) {
      throw new Error("Fonds insuffisants.");
    }
    compte.debiter(montant); // la mutation est déléguée au compte
  }
}

module.exports = RetraitService;