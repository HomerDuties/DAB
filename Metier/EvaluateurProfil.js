// =============================================================================
// EvaluateurProfil — Classe MÉTIER (interprétation du profil)
// =============================================================================
// Acte 1 de la règle de découvert : traduire un ClientProfile BRUT en un
// facteur de fiabilité [0..1] exploitable par la décision (CalculateurDecouvert).
//
// Séparé de la décision pour la RÉUTILISATION : ce même facteur pourrait
// servir à d'autres produits (prêt, carte de crédit...) sans duplication.
// On peut aussi le tester SEUL, indépendamment du montant final.
//
// RÈGLE (injectable au constructeur) :
//   facteur = scoreFiabilite/100
//            × 0.5 si compte récent (< ancienneteMinMois)   <- modulation
//            − penaliteParIncident × nbIncidents             <- pénalité
//   borné entre 0 et 1. Les incidents ne peuvent pas rendre le facteur négatif.
//
// Gestion fine des paramètres :
//   - Constructeur : regles (config stable injectée)
//   - Méthode evaluer(profile) : 1 seul paramètre objet (Parameter Object)
// =============================================================================

class EvaluateurProfil {
  constructor(regles = {}) {
    this.regles = {
      ancienneteMinMois: 6,
      facteurAncienneteRecente: 0.5,
      penaliteParIncident: 0.2,
      ...regles,
    };
  }

  evaluer(profile) {
    let facteur = profile.getScoreFiabilite() / 100;

    if (profile.getAncienneteMois() < this.regles.ancienneteMinMois) {
      facteur *= this.regles.facteurAncienneteRecente;
    }

    facteur -= this.regles.penaliteParIncident * profile.getNbIncidents();

    return Math.max(0, Math.min(1, facteur));
  }
}

module.exports = EvaluateurProfil;
