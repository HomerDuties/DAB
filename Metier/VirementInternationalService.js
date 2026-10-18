// =============================================================================
// VirementInternationalService — Classe MÉTIER (orchestrateur complexe)
// =============================================================================
// Règle complexe n°1 : un virement qui circule entre plusieurs objets et
// suit un PIPELINE d'étapes :
//   1. vérifier le plafond             (PolitiquePlafond    → DÉCIDE)
//   2. convertir le montant en devises (ConvertisseurDevises → PRODUIT)
//   3. calculer les frais              (PolitiqueFrais       → PRODUIT)
//   4. vérifier la couverture          (les comptes          → DÉCIDENT)
//   5. débiter source / créditer cible (les comptes          → EXÉCUTENT)
//   6. journaliser                     (CarnetOperation      → CONSOMME)
//
// GESTION FINE DES PARAMÈTRES :
//   - Constructeur (dépendances STABLES, objet param déstructuré) :
//       convertisseur, politiqueFrais, politiquePlafond, carnetOperation
//   - Méthode effectuerVirement(montant, compteSource, compteCible, deviseCible)
//     : les 4 DONNÉES D'OPÉRATION qui varient à chaque appel.
//
// Le service n'a AUCUN état propre ; toute la mémoire vit dans
// CarnetOperation (classe DONNÉE). Il reste générique et réutilisable.
// =============================================================================

class VirementInternationalService {
  constructor({ convertisseur, politiqueFrais, politiquePlafond, carnetOperation }) {
    this.convertisseur = convertisseur;         // stable
    this.politiqueFrais = politiqueFrais;       // stable
    this.politiquePlafond = politiquePlafond;   // stable
    this.carnetOperation = carnetOperation;     // stable (mémoire partagée)
  }

  effectuerVirement(montant, compteSource, compteCible, deviseCible) {
    // 1. Garde-fou AVANT tout mouvement.
    this.politiquePlafond.verifier(montant);

    // 2. Le montant est exprimé en devise du compte source ; on le convertit.
    const montantConverti = this.convertisseur.convertir(montant, deviseCible);

    // 3. Les frais sont prélevés sur le compte source (dans sa devise).
    const frais = this.politiqueFrais.calculer(montant);
    const totalADebiter = montant + frais;

    // 4. Le compte source doit couvrir montant + frais (découvert si configuré).
    if (!compteSource.peutCouvrir(totalADebiter)) {
      throw new Error("Fonds insuffisants pour le virement international (montant + frais).");
    }

    // 5. Les mutations sont déléguées aux comptes (leur responsabilité).
    compteSource.debiter(totalADebiter);
    compteCible.crediter(montantConverti);

    // 6. Traçabilité : la mémoire vit dans le carnet (objet DONNÉE).
    this.carnetOperation.ajouter({
      date: new Date().toISOString(),
      type: "VIR_INTERNATIONAL",
      montant,
      deviseCible,
      montantConverti,
      frais,
      totalDebite: totalADebiter,
      source: compteSource.type,
      cible: compteCible.type,
    });
  }
}

module.exports = VirementInternationalService;
