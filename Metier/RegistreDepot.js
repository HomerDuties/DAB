// =============================================================================
// RegistreDepot — Classe DONNÉE (état des dépôts de la journée)
// =============================================================================
// Répond au « QUOI ? » : combien a-t-on déjà déposé aujourd'hui, par compte ?
// C'est LA mémoire de la règle de plafond journalier — et on la sort du
// service pour qu'il garde son statut « sans état » (réutilisable, testable).
//
// Ce registre porte l'état (un Map compte → total) et gère son propre cycle :
// quand le jour change, il se remet à zéro tout seul (mémoire fraîche).
//
// AUCUNE décision métier ici : il enregistre et restitue ; c'est
// DepotPlafonneService qui décide d'accepter ou de refuser le dépôt.
// =============================================================================

class RegistreDepot {
  constructor() {
    this.dateDuJour = new Date().toDateString();
    this.depotsParCompte = new Map(); // clé : l'objet Compte → total déposé
  }

  // Si la date a changé depuis la dernière opération, on repart de zéro.
  _basculerJourSiNecessaire() {
    const aujourdhui = new Date().toDateString();
    if (aujourdhui !== this.dateDuJour) {
      this.dateDuJour = aujourdhui;
      this.depotsParCompte.clear();
    }
  }

  // Total déjà déposé aujourd'hui sur `compte` (0 si rien).
  totalDuJour(compte) {
    this._basculerJourSiNecessaire();
    return this.depotsParCompte.get(compte) ?? 0;
  }

  // Ajoute `montant` au total déjà déposé sur `compte` aujourd'hui.
  enregistrer(compte, montant) {
    this._basculerJourSiNecessaire();
    this.depotsParCompte.set(compte, this.totalDuJour(compte) + montant);
  }
}

module.exports = RegistreDepot;
