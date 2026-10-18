// =============================================================================
// PaiementFactureService — Classe MÉTIER (paiement d'une facture)
// =============================================================================
// Responsabilité unique : payer une facture. Mais ATTENTION à la façon :
//
// Mécaniquement, payer une facture EST un virement dont le compte de
// destination est celui de l'émetteur de la facture. Plutôt que de
// DUPLIQUER le code de VirementService (violation DRY), on use de la
// COMPOSITION : ce service POSSÈDE un VirementService (injecté) et lui
// DÉLÈGUE le mouvement d'argent.
//
// Ce service ne porte donc QUE la spécificité du paiement de facture,
// c'est-à-dire la notion de Facture (objet paramètre).
//
// DÉPENDANCES (injectées au constructeur — stables, ne varient pas) :
//   - virementService : le VirementService auquel on délègue le mouvement
//
// QUI L'APPELLE ? Un ORCHESTRATEUR (ex. DABOrchestrator) qui, quand l'utilisateur
// choisit « payer une facture », récupère la facture et le compte du payeur
// puis appelle payerFacture(facture, comptePayer).
//
// GESTION FINE DES PARAMÈTRES :
//   - Méthode payerFacture(facture, comptePayer) : seulement 2 paramètres,
//     grâce au Parameter Object « Facture » (montant + reference + emetteur).
// =============================================================================

class PaiementFactureService {
  constructor(virementService) {
    this.virementService = virementService; // dépendance stable injectée
  }

  // Paye une facture : le mouvement est délégué à VirementService, en
  // prenant pour compte cible le COMPTE DE L'ÉMETTEUR (destination = le
  // créancier).
  payerFacture(facture, comptePayer) {
    this.virementService.effectuerVirement(
      facture.montant,
      comptePayer,           // le payeur (source du débit)
      facture.compteEmetteur // le créancier (destination du crédit)
    );
  }
}

module.exports = PaiementFactureService;