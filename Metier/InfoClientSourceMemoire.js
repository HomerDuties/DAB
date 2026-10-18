// =============================================================================
// InfoClientSourceMemoire — SOURCE DE DONNÉES (2e implémentation du CONTRAT)
// =============================================================================
// Répond au « D'OÙ ? » : d'où viennent les infos du client ?
//   - Premier support : fichiers JSON  (InfoClientSource)
//   - Ici            : données INJECTÉES en mémoire, même gabarit que
//                      clients.json : { id, nom, email, adresse, tel }.
//
// Même CONTRAT que InfoClientSource (cf. FabriqueInfoClientSource) :
//   `trouverParId(id) -> InfoClient`, erreur explicite si id inconnu.
//   Le consommateur (ex. Client via la fabrique) ne distingue PAS les deux
//   sources : c'est la preuve de la frontière « le Client ignore d'où
//   viennent ses infos ».
//
// Idéale pour les TESTS et les DÉMOS (aucun disque, données maîtrisées),
// et comme SECOURS simple quand le fichier n'est pas disponible.
// =============================================================================

const InfoClient = require("./InfoClient.js");

class InfoClientSourceMemoire {
  constructor({ donnees = [] } = {}) {
    this.donnees = donnees;
  }

  // Retourne un InfoClient, ou lève une erreur EXPLICITE si l'id est inconnu.
  trouverParId(id) {
    const trouve = this.donnees.find((c) => c.id === id);

    if (trouve === undefined) {
      throw new Error(`Aucun client avec l'id ${id} dans la source en mémoire`);
    }

    // Transforme l'objet brut en vraie classe DONNÉE (déstructuration :
    // InfoClient ne prend que ce dont il a besoin).
    return new InfoClient(trouve);
  }
}

module.exports = InfoClientSourceMemoire;
