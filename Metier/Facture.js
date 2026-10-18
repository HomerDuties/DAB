// =============================================================================
// Facture — Classe DONNÉE (une facture à payer)
// =============================================================================
// Responsabilité unique : PORTER les données d'une facture (objet paramètre).
//
// Rôle dans la gestion fine des paramètres :
//   En groupant reference + montant + compteEmetteur dans un objet unique,
//   on évite de passer ces 3 valeurs séparément à chaque méthode (Parameter
//   Object). PaiementFactureService n'aura qu'à recevoir CET objet + le
//   compte du payeur → 2 paramètres au lieu de 4.
//
// Constructeur (essentiels pour exister) :
//   - reference       : identifiant de la facture (ex. "EDF-2026-001")
//   - montant         : montant dû
//   - compteEmetteur  : le compte du CRÉANCIER → c'est la DESTINATION du
//                       paiement (= le même rôle que la cible d'un virement)
// =============================================================================

class Facture {
  constructor(reference, montant, compteEmetteur) {
    this.reference = reference;
    this.montant = montant;
    this.compteEmetteur = compteEmetteur;
  }
}

module.exports = Facture;