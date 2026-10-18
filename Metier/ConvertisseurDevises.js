// =============================================================================
// ConvertisseurDevises — Classe MÉTIER (calcul pur de conversion)
// =============================================================================
// Responsabilité unique : convertir un montant d'une devise de base vers
// une devise cible (besoin 8 : retrait en devises étrangères).
//
// C'est une classe de CALCUL PUR : aucun état partagé, aucun flux à
// orchestrer entre objets. On lui injecte sa configuration et elle rend
// une valeur.
//
// BONNE PRATIQUE « valeur d'environnement » (voir CLINE.md) :
//   Les taux de change sont de la CONFIGURATION : ils ne varient pas à
//   chaque conversion (ils pourraient venir d'un .env ou d'un fournisseur).
//   On les INJECTE donc au constructeur (dépendance stable) plutôt que de
//   les repasser comme paramètre à chaque appel.
//
// Gestion fine des paramètres :
//   - Constructeur (dépendances stables) :
//       deviseBase    : la devise de référence (ex. "EUR")
//       tauxParDevise : objet { devise: taux } (ex. { USD: 1.09 })
//   - Méthode convertir(montant, deviseCible) : 2 paramètres variables
// =============================================================================

class ConvertisseurDevises {
  constructor(deviseBase, tauxParDevise = {}) {
    this.deviseBase = deviseBase;
    this.tauxParDevise = tauxParDevise;
  }

  // Convertit montant (exprimé en deviseBase) vers deviseCible.
  convertir(montant, deviseCible) {
    if (deviseCible === this.deviseBase) {
      return montant; // même devise : aucun calcul
    }

    const taux = this.tauxParDevise[deviseCible];
    if (taux === undefined) {
      throw new Error(`Devise inconnue : ${deviseCible}`);
    }
    return Math.round(montant * taux);
  }
}

module.exports = ConvertisseurDevises;