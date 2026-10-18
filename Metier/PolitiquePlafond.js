// =============================================================================
// PolitiquePlafond — Classe MÉTIER (garde-fou sur le montant d'un virement)
// =============================================================================
// Qui décide QUOI : ce module DÉCIDE si un montant est autorisé.
// Avant tout mouvement d'argent, on vérifie que le montant du virement ne
// dépasse pas le plafond défini (sécurité / réglementation).
//
// Gestion fine des paramètres :
//   - Constructeur : plafond (valeur d'environnement, défaut 5000 €)
//   - Méthode verifier(montant) : 1 seul paramètre variable.
//     La signature est « suspensive » : elle ne rend rien, elle THROWS si
//     le montant dépasse le seuil. On l'appelle en tout début de pipeline.
// =============================================================================

class PolitiquePlafond {
  constructor(plafond = 5000) {
    this.plafond = plafond;
  }

  verifier(montant) {
    if (montant > this.plafond) {
      throw new Error(`Virement refusé : montant ${montant} € > plafond ${this.plafond} €.`);
    }
  }
}

module.exports = PolitiquePlafond;
