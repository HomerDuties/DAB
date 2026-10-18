// =============================================================================
// DepotPlafonneService — Classe MÉTIER (dépôt limité par jour)
// =============================================================================
// Règle complexe n°2 : un dépôt d'espèces plafonné à 500 € / jour / compte.
// C'est une règle ÉTATFUL... mais sans rendre le service étatful :
//   - l'état (total déposé aujourd'hui) vit dans RegistreDepot (classe DONNÉE),
//   - le service reste un comportement réutilisable, sans mémoire propre.
//
// GESTION FINE DES PARAMÈTRES :
//   - Constructeur (dépendance stable + configuration) :
//       registreDepot (état partagé), plafondJournalier (valeur d'env, défaut)
//   - Méthode deposer(montant, compte) : 2 données d'opération variables.
// =============================================================================

class DepotPlafonneService {
  constructor(registreDepot, plafondJournalier = 500) {
    this.registreDepot = registreDepot;
    this.plafondJournalier = plafondJournalier;
  }

  deposer(montant, compte) {
    if (montant <= 0) {
      throw new Error("Montant de dépot invalide.");
    }

    // On consulte la mémoire du jour AVANT de créditer.
    const totalApres = this.registreDepot.totalDuJour(compte) + montant;
    if (totalApres > this.plafondJournalier) {
      throw new Error(
        `Dépôt refusé : plafond journalier dépassé (${totalApres} € > ${this.plafondJournalier} €).`
      );
    }

    compte.crediter(montant);                        // mutation déléguée au compte
    this.registreDepot.enregistrer(compte, montant); // mémoire mise à jour
  }
}

module.exports = DepotPlafonneService;
