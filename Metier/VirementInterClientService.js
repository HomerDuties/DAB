// =============================================================================
// VirementInterClientService — Classe MÉTIER (orchestrateur complexe)
// =============================================================================
// Virement ENTRE DEUX CLIENTS (comptes quelconques) : variante du
// VirementInternationalService SANS conversion de devises. Pipeline :
//   1. rejeter un montant invalide          (garde-fou `montant <= 0`)
//   2. rejeter un virement vers soi-même    (source === cible)
//   3. vérifier le plafond                  (PolitiquePlafond → DÉCIDE)
//   4. calculer les frais                   (PolitiqueFrais   → PRODUIT)
//   5. vérifier la couverture montant+frais (les comptes      → DÉCIDENT)
//   6. débiter source / créditer cible      (les comptes      → EXÉCUTENT)
//   7. journaliser                          (CarnetOperation  → CONSOMME)
//
// GESTION FINE DES PARAMÈTRES :
//   - Constructeur (dépendances STABLES, objet param déstructuré) :
//       politiqueFrais, politiquePlafond, carnetOperation
//   - Méthode effectuerVirement(compteSource, compteCible, montant, devise)
//     : les DONNÉES D'OPÉRATION qui varient à chaque appel.
//   - Retour : { montant, frais, totalDebite } (contrat RetraitPlafonneService).
//
// Le service n'a AUCUN état propre ; toute la mémoire vit dans
// CarnetOperation (classe DONNÉE). Il reste générique et réutilisable.
// =============================================================================

class VirementInterClientService {
  constructor({ politiqueFrais, politiquePlafond, carnetOperation }) {
    this.politiqueFrais = politiqueFrais;       // stable
    this.politiquePlafond = politiquePlafond;   // stable
    this.carnetOperation = carnetOperation;     // stable (mémoire partagée)
  }

  effectuerVirement(compteSource, compteCible, montant, devise) {
    // 1. Garde-fou AVANT tout mouvement : montant invalide.
    if (montant <= 0) {
      throw new Error("Montant de virement invalide.");
    }

    // 2. Virement vers le même compte impossible.
    if (compteCible === compteSource) {
      throw new Error("Impossible de transférer vers le même compte.");
    }

    // 3. Plafond réglementaire (sécurité).
    this.politiquePlafond.verifier(montant);

    // 4. Les frais sont prélevés sur le compte source (dans sa devise).
    const frais = this.politiqueFrais.calculer(montant);
    const totalADebiter = montant + frais;

  
    // 5. Le compte source doit couvrir montant + frais (découvert si configuré).
    if (!compteSource.peutCouvrir(totalADebiter)) {
      throw new Error("Fonds insuffisants pour le virement inter-clients (montant + frais).");
    }

    // 6. Les mutations sont déléguées aux comptes (leur responsabilité).
    compteSource.debiter(totalADebiter);
    compteCible.crediter(montant);

    // 7. Traçabilité : la mémoire vit dans le carnet (objet DONNÉE).
    this.carnetOperation.ajouter({
      date: new Date().toISOString(),
      type: "VIR_INTER_CLIENT",
      devise,
      montant,
      frais,
      totalDebite: totalADebiter,
      source: compteSource.label,
      cible: compteCible.label,
    });

    return { montant, frais, totalDebite: totalADebiter };
  }
}

module.exports = VirementInterClientService;
