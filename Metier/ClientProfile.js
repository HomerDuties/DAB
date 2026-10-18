// =============================================================================
// ClientProfile — Classe DONNÉE (profil du client)
// =============================================================================
// Répond au « QUOI ? » : que sait-on du client pour évaluer son découvert ?
// C'est un OBJET PARAMÈTRE (Parameter Object) : les données qui voyagent
// ensemble (score, ancienneté, incidents, revenu, type) sont regroupées ici
// au lieu de 5-6 paramètres séparés dans les méthodes.
//
// AUCUNE règle ici : uniquement des données + getters. L'interprétation de
// ces données est la responsabilité des classes MÉTIER (voir EvaluateurProfil).
//
// Paramètres (constructeur) :
//   typeCompte      : "courant" | "epargne"
//   revenuMensuel   : nombre
//   scoreFiabilite  : 0 à 100 (fourni par un service de scoring externe)
//   ancienneteMois  : ancienneté du compte en mois
//   nbIncidents     : nombre d'incidents (rejets, impayés)
// =============================================================================

class ClientProfile {
  constructor({ typeCompte, revenuMensuel, scoreFiabilite, ancienneteMois, nbIncidents }) {
    this.typeCompte = typeCompte;
    this.revenuMensuel = revenuMensuel;
    this.scoreFiabilite = scoreFiabilite;
    this.ancienneteMois = ancienneteMois;
    this.nbIncidents = nbIncidents;
  }

  getTypeCompte() { return this.typeCompte; }
  getRevenuMensuel() { return this.revenuMensuel; }
  getScoreFiabilite() { return this.scoreFiabilite; }
  getAncienneteMois() { return this.ancienneteMois; }
  getNbIncidents() { return this.nbIncidents; }
}

module.exports = ClientProfile;