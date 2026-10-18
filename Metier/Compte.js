// =============================================================================
// Compte — Classe DONNÉE (porte l'état financier d'un compte)
// =============================================================================
// Responsabilité unique : porter et gérer SON PROPRE état (solde).
//
// Le compte modifie lui-même son solde (debiter/crediter). Aucun service
// extérieur ne vient « tripatouiller » la donnée : c'est la bonne frontière
// entre classe donnée et classe métier.
//
// Paramètres du constructeur (essentiels pour exister) :
//   - type            : "courant" | "epargne"
//   - soldeInitial    : solde auquel le compte est créé
//   - decouvertAutorise : (optionnel, défaut false) autorise un solde négatif
// =============================================================================

class Compte {
  constructor(label, type, soldeInitial, decouvertAutorise = false) {
    this.label = label;
    this.type = type;
    this.solde = soldeInitial;
    this.decouvertAutorise = decouvertAutorise;
  }

  // Retourne le label du compte (Consultation)
  getLabel(){
    return this.label
  }

  // Débite le compte (retrait, virement sortant, paiement...).
  debiter(montant) {
    if (montant <= 0) {
      throw new Error("Montant de débit invalide.");
    }
    if (montant > this.solde && !this.decouvertAutorise) {
      throw new Error("Fonds insuffisants.");
    }
    this.solde -= montant;
  }

  // Crédite le compte (dépôt, virement entrant...).
  crediter(montant) {
    if (montant <= 0) {
      throw new Error("Montant de crédit invalide.");
    }
    this.solde += montant;
  }

  // Indique si le compte peut couvrir un montant (solde ou découvert).
  peutCouvrir(montant) {
    return montant <= this.solde || this.decouvertAutorise;
  }

  // Lecture simple du solde (consultation) — aucun état partagé.
  getSolde() {
    return this.solde;
  }
}

module.exports = Compte;