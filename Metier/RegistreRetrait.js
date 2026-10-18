// =============================================================================
// RegistreRetrait — Classe DONNÉE (état des retraits de la journée)
// =============================================================================
// Répond au « QUOI ? » : combien a-t-on déjà retiré aujourd'hui et en combien
// d'opérations, PAR COMPTE ? C'est LA mémoire de la règle de plafond
// journalier (montant ET nombre d'opérations) — on la sort du service pour
// qu'il reste « sans état » (réutilisable, testable).
//
// Comme RegistreDepot : quand le jour change, le registre se remet à zéro
// tout seul (mémoire fraîche). Ici on mémorise, pour chaque compte, un état
// { total: €, nbOperations: n }.
//
// AUCUNE décision métier ici : il enregistre et restitue ; c'est
// RetraitPlafonneService qui décide d'accepter ou de refuser le retrait.
// =============================================================================

class RegistreRetrait {
  constructor() {
    this.dateDuJour = new Date().toDateString();
    this.retraitsParCompte = new Map(); // clé : objet Compte → { total, nbOperations }
  }

  // Si la date a changé depuis la dernière opération, on repart de zéro.
  _basculerJourSiNecessaire() {
    const aujourdhui = new Date().toDateString();
    if (aujourdhui !== this.dateDuJour) {
      this.dateDuJour = aujourdhui;
      this.retraitsParCompte.clear();
    }
  }

  // Total déjà retiré aujourd'hui sur `compte` (0 si rien).
  totalDuJour(compte) {
    this._basculerJourSiNecessaire();
    return this.retraitsParCompte.get(compte)?.total ?? 0;
  }

  // Nombre d'opérations de retrait déjà faites aujourd'hui sur `compte`.
  nbOperationsDuJour(compte) {
    this._basculerJourSiNecessaire();
    return this.retraitsParCompte.get(compte)?.nbOperations ?? 0;
  }

  // Ajoute un retrait de `montant` (et +1 opération) sur `compte`.
  enregistrer(compte, montant) {
    this._basculerJourSiNecessaire();
    const etat = this.retraitsParCompte.get(compte) ?? { total: 0, nbOperations: 0 };
    etat.total += montant;
    etat.nbOperations += 1;
    this.retraitsParCompte.set(compte, etat);
  }
}

module.exports = RegistreRetrait;
