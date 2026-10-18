// =============================================================================
// CalculateurDecouvert — Classe MÉTIER (décision du découvert)
// =============================================================================
// Acte 2 de la règle de découvert : à partir du FACTEUR de fiabilité déjà
// interprété (fourni par EvaluateurProfil) et des données du client,
// décider du montant final du découvert.
//
// Ce module ne connaît PAS la règle d'interprétation du profil : il reçoit
// un facteur déjà calculé. C'est la séparation des responsabilités choisie
// pour ne dupliquer ni l'interprétation ni la décision.
//
// RÈGLE (injectable au constructeur) :
//   maxParType   = plafond selon type de compte (épargne : souvent 0)
//   maxParRevenu = revenuMensuel × ratioSurRevenu   (cap absolu)
//   maxThéorique = min(maxParType, maxParRevenu)
//   découvert    = maxThéorique × facteur           (le facteur réduit le montant)
//
// Gestion fine des paramètres :
//   - Constructeur : regles (config stable injectée)
//   - Méthode calculerDecouvert(typeCompte, revenuMensuel, facteur) : 3 params
// =============================================================================

class CalculateurDecouvert {
  constructor(regles = {}) {
    this.regles = {
      plafondCourant: 500,
      plafondEpargne: 0,
      ratioSurRevenu: 0.3,
      ...regles,
    };
  }

  calculerDecouvert(typeCompte, revenuMensuel, facteur) {
    const maxParType =
      typeCompte === "epargne" ? this.regles.plafondEpargne : this.regles.plafondCourant;

    const maxParRevenu = revenuMensuel * this.regles.ratioSurRevenu;

    const maxTheorique = Math.min(maxParType, maxParRevenu);

    return Math.round(maxTheorique * facteur);
  }
}

module.exports = CalculateurDecouvert;