// =============================================================================
// PolitiqueFrais — Classe MÉTIER (calcul des frais de virement)
// =============================================================================
// Qui produit QUOI : ce module PRODUIT le montant des frais.
// C'est une règle métier pure (pas d'état), injectable, donc testable seule.
//
// RÈGLE (config injectable au constructeur) :
//   frais = montant × taux   (taux = 0,5 % par défaut)
//   frais finale = max(minimum, frais)   → on facture au moins `minimum` €.
//
// ⚠️ DEUX RÈGLES DISTINCTES — PAS UN DOUBLON : ce module calcule les frais de
//   VIREMENT ; CalculFraisService calcule les frais de RETRAIT DAB (gratuit ≤ 100 €,
//   plancher 0,50 €, garde montant ≤ 0). Ils partagent seulement la FORMULE
//   « max(minimum, montant × taux) » — ne pas fusionner : des règles à contextes
//   différents peuvent diverger davantage un jour (ex. tarifs par classe de compte).
//
// Gestion fine des paramètres :
//   - Constructeur : regles (configuration stable)
//   - Méthode calculer(montant) : l'UNIQUE donnée d'opération variable.
//   Évolution possible (non implémentée) : transmettre compteSource/compteCible
//   pour faire varier le taux selon la classe de compte du client.
// =============================================================================

class PolitiqueFrais {
  constructor(regles = {}) {
    this.regles = {
      taux: 0.005,       // 0,5 % du montant
      minimum: 1,        // frais plancher en €
      ...regles,
    };
  }

  calculer(montant) {
    const fraisBrut = montant * this.regles.taux;
    return Math.round(Math.max(this.regles.minimum, fraisBrut) * 100) / 100;
  }
}

module.exports = PolitiqueFrais;
