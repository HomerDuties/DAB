// =============================================================================
// RetraitPlafonneService — Classe MÉTIER (retrait DAB plafonné + frais)
// =============================================================================
// Règle « complexe » : le retrait d'espèces combine DEUX garde-fous et un coût.
// Pipeline d'étapes (l'état vit dans RegistreRetrait, classe DONNÉE) :
//   1. contrôler le plafond journalier   (RegistreRetrait     → DÉCIDE)
//   2. contrôler le nb d'opérations/jour  (RegistreRetrait     → DÉCIDE)
//   3. calculer les frais DAB si > 100 €  (CalculFraisService  → PRODUIT)
//   4. vérifier la couverture montant+frais (le compte         → DÉCIDE)
//   5. débiter via RetraitService         (RetraitService      → EXÉCUTE)
//   6. mémoriser le retrait               (RegistreRetrait     → CONSOMME)
//
// GESTION FINE DES PARAMÈTRES :
//   - Constructeur (dépendances STABLES, objet param déstructuré) :
//       retraitService, calculFraisService, registreRetrait, plafondJournalier,
//       plafondOperations
//   - Méthode retirer(montant, compte) : les 2 DONNÉES D'OPÉRATION variables.
//
// Le service n'a AUCUN état propre ; toute la mémoire vit dans RegistreRetrait.
// Il reste générique et réutilisable.
// =============================================================================

class RetraitPlafonneService {
  constructor({ retraitService, calculFraisService, registreRetrait, plafondJournalier = 300, plafondOperations = 5 }) {
    this.retraitService = retraitService;         // stable
    this.calculFraisService = calculFraisService; // stable
    this.registreRetrait = registreRetrait;       // stable (mémoire partagée)
    this.plafondJournalier = plafondJournalier;   // € / jour / compte
    this.plafondOperations = plafondOperations;   // opérations / jour / compte
  }

  retirer(montant, compte) {
    // 1. Garde-fous AVANT tout mouvement.
    if (montant <= 0) {
      throw new Error("Montant de retrait invalide.");
    }
    const totalApres = this.registreRetrait.totalDuJour(compte) + montant;
    if (totalApres > this.plafondJournalier) {
      throw new Error(
        `Retrait refusé : plafond journalier dépassé (${totalApres} € > ${this.plafondJournalier} €).`
      );
    }
    const operationsApres = this.registreRetrait.nbOperationsDuJour(compte) + 1;
    if (operationsApres > this.plafondOperations) {
      throw new Error(
        `Retrait refusé : nombre d'opérations dépassé (${operationsApres} > ${this.plafondOperations}).`
      );
    }

    // 2. Frais DAB sur les retraits > 100 € (0 € sinon), payés par le client.
    const frais = this.calculFraisService.calculerFrais(montant);
    const totalADebiter = montant + frais;

    // 3. Le compte doit couvrir montant + frais (découvert si configuré).
    if (!compte.peutCouvrir(totalADebiter)) {
      throw new Error("Fonds insuffisants pour le retrait (montant + frais).");
    }

    // 4. La mutation est déléguée au service de retrait (puis au compte).
    this.retraitService.retirer(totalADebiter, compte);

    // 5. Traçabilité : la mémoire du jour vit dans le registre (objet DONNÉE).
    this.registreRetrait.enregistrer(compte, montant);

    return { montant, frais, totalDebite: totalADebiter };
  }
}

module.exports = RetraitPlafonneService;
