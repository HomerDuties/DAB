// =============================================================================
// CalculFraisService — Classe MÉTIER (frais de retrait DAB)
// =============================================================================
// Qui produit QUOI : ce module PRODUIT le montant des frais d'un retrait.
// C'est une règle métier PURE et SANS ÉTAT : injectable, donc testable seule.
//
// RÈGLE (configuration injectable au constructeur) :
//   - retrait ≤ seuilGratuit (100 € par défaut) → frais = 0 € (retrait gratuit)
//   - retrait  > seuilGratuit                  → frais = montant × taux
//       taux = 0,5 % par défaut, frais FINALE = max(minimum, frais)
//       minimum = 0,50 € par défaut.
//   Ex.   50 € → 0 €    |   100 € → 0 €    |   101 € → 0,51 €    |   150 € → 0,75 €
//
// ⚠️ DEUX RÈGLES DISTINCTES — PAS UN DOUBLON : ce module calcule les frais de
//   RETRAIT DAB ; PolitiqueFrais calcule les frais de VIREMENT (plancher 1 €,
//   pas de seuil gratuit, pas de garde montant ≤ 0). Ils partagent seulement la
//   FORMULE « max(minimum, montant × taux) » — ne pas fusionner.
//
// GESTION FINE DES PARAMÈTRES :
//   - Constructeur : configuration stable (seuil, taux, minimum)
//   - Méthode calculerFrais(montant) : l'UNIQUE donnée d'opération variable.
// =============================================================================

class CalculFraisService {
  constructor(config = {}) {
    this.config = {
      seuilGratuit: 100, // en €
      taux: 0.005,       // 0,5 % du montant
      minimum: 0.5,      // frais plancher en €
      ...config,
    };
  }

  calculerFrais(montant) {
    if (montant <= 0) {
      throw new Error("Montant invalide pour le calcul des frais.");
    }
    if (montant <= this.config.seuilGratuit) {
      return 0;
    }
    const fraisBrut = montant * this.config.taux;
    return Math.round(Math.max(this.config.minimum, fraisBrut) * 100) / 100;
  }
}

module.exports = CalculFraisService;
