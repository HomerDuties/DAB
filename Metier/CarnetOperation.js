// =============================================================================
// CarnetOperation — Classe DONNÉE (historique des opérations)
// =============================================================================
// Répond au « QUOI ? » : la trace de CE QUI S'EST PASSÉ.
// C'est un état partagé entre plusieurs services (virement international,
// dépôt...) qui sert à journaliser chaque opération pour la traçabilité.
//
// Dépendance STABLE typique : les services qui veulent journaliser reçoivent
// ce carnet AU CONSTRUCTEUR (il ne change pas entre les appels), puis
// l'« alimentent » à chaque opération via la méthode ajouter(...).
//
// AUCUNE règle métier ici : il s'accumule et se laisse lire.
// =============================================================================

class CarnetOperation {
  constructor() {
    this.historique = []; // tableau d'objets-opérations
  }

  // Journalise une opération (l'objet est fourni par le service appelant).
  ajouter(operation) {
    this.historique.push(operation);
  }

  // Nombre d'opérations enregistrées.
  nbOperations() {
    return this.historique.length;
  }

  // Copie de l'historique (on ne donne jamais l'accès direct au tableau).
  lister() {
    return [...this.historique];
  }
}

module.exports = CarnetOperation;
