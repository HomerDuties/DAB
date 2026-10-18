// =============================================================================
// CalculateurDecouvertGlobal — Classe MÉTIER (découvert garanti multi-comptes)
// =============================================================================
// Règle complexe n°3 : le découvert n'est plus calculé compte par compte,
// mais sur l'ENSEMBLE des comptes du client (approche agrégée).
//
// Pipeline :
//   1. l'APPELANT traduit le profil en facteur de fiabilité [0..1]
//      (via EvaluateurProfil — l'évaluation reste EN DEHORS du module,
//       même borne que CalculateurDecouvert : on ne reçoit QUE des données)
//   2. le facteur est converti en coefficient (table de seuils injectée)
//   3. la GARANTIE = soldeTotal (tous comptes confondus) × coefficient
//   4. le découvert demandé est accordé s'il est ≤ garantie
//
// GESTION FINE DES PARAMÈTRES :
//   - Constructeur (config stable) : coefficientParFacteur (table des seuils)
//   - Méthode calculer(client, decouvertDemande, facteur) : l'objet Client
//     ENTIER (Parameter Object) + le montant demandé + le facteur déjà calculé.
//   Le résultat renvoyé est aussi un objet (Parameter Object en sortie).
// =============================================================================

class CalculateurDecouvertGlobal {
  constructor(coefficientParFacteur) {
    // Table des seuils : { facteur: coefficient } — plus le facteur est haut,
    // plus la part du solde total pouvant servir de garantie est élevée.
    this.coefficientParFacteur = coefficientParFacteur ?? {
      1: 0.3,    // client très fiable → 30 % de ses avoirs comme garantie
      0.5: 0.15, // client moyen       → 15 %
      0: 0,      // client risqué      → 0 %
    };
  }

  calculer(client, decouvertDemande, facteur) {
    const coefficient = this._coefficientPour(facteur);

    // La garantie s'appuie sur la somme des soldes de TOUS les comptes.
    const garantie = Math.round(client.soldeTotal() * coefficient);

    if (decouvertDemande <= garantie) {
      return { accorde: true, montant: decouvertDemande, garantie, facteur, coefficient };
    }
    return { accorde: false, montant: 0, garantie, facteur, coefficient };
  }

  // Fait correspondre un facteur continu à l'un des seuils de la table.
  // Ex. : facteur 0.9 → seuil 1 (arrondi à la demi-unité la plus proche).
  _coefficientPour(facteur) {
    const cle = Math.round(facteur * 2) / 2; // 0 | 0.5 | 1
    return this.coefficientParFacteur[cle] ?? 0;
  }
}

module.exports = CalculateurDecouvertGlobal;
