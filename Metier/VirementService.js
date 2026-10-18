// =============================================================================
// VirementService — Classe MÉTIER orchestrateur
// =============================================================================
// Responsabilité unique : ORCHESTRER un virement entre DEUX comptes.
//
// C'est le cas « pluralité d'objets » : une action métier (le virement)
// implique plusieurs objets qui coopèrent. Le service coordonne la
// circulation des données entre le compte source et le compte cible.
//
// Le service est SANS ÉTAT (constructeur vide) : ce dont il a besoin pour
// fonctionner vient en paramètres de la méthode (données d'opération),
// car elles varient à CHAQUE appel. Aucune dépendance stable à injecter
// pour l'instant (limite, historique...) — à voir plus tard.
// =============================================================================

class VirementService {
  constructor() {
    // Orchestrateur stateless : aucun état propre.
    // On pourra y injecter plus tard des dépendances stables (ex. une
    // limite de virement, un journal de l'historique), mais ce ne sont
    // PAS des données variables par appel.
  }

  // Orchestration du virement :
  //   montant       : la donnée d'opération (varie à chaque appel)
  //   compteSource  : le compte qui sera débité
  //   compteCible   : le compte qui sera crédité
  effectuerVirement(montant, compteSource, compteCible) {
    if (montant <= 0) {
      throw new Error("Montant de virement invalide.");
    }
    if (compteSource === compteCible) {
      throw new Error("Impossible de virer vers le même compte.");
    }
    if (!compteSource.peutCouvrir(montant)) {
      throw new Error("Fonds insuffisants pour le virement.");
    }

    // Circulation des données entre les 2 objets :
    compteSource.debiter(montant); // le débit est géré par le compte source
    compteCible.crediter(montant); // le crédit est géré par le compte cible
  }
}

module.exports = VirementService;