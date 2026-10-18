// =============================================================================
// InfoClientSource — SOURCE DE DONNÉES (acquisition, pas décision métier)
// =============================================================================
// Répond au « D'OÙ ? » : d'où viennent les infos du client ?
//   → Ici : un fichier clients.json (en vrai : base de données, API...).
//
// Ce n'est PAS une classe métier : elle ne décide AUCUNE politique. Elle lit
// la source et RETOURNE un InfoClient tout construit (classe DONNÉE).
// Elle ne « remplit » JAMAIS un Client existant — frontière respectée.
// Implémente le CONTRAT SOURCE (cf. FabriqueInfoClientSource) : l'une des deux
// sources interchangeables, avec InfoClientSourceMemoire.
//
// Injection de la dépendance `stockage` (fs) → testable avec un faux fs.
// =============================================================================

const fs = require("fs");
const path = require("path");
const InfoClient = require("./InfoClient.js");

class InfoClientSource {
  // Par défaut, lit clients.json situé à côté de cette classe (dans DAB/).
  constructor({ chemin = path.join(__dirname, "clients.json"), stockage = fs } = {}) {
    this.chemin = chemin;
    this.stockage = stockage;
  }

  // Retourne l'InfoClient d'id donné, ou lève une erreur EXPLICITE sinon.
  trouverParId(id) {
    const contenu = this.stockage.readFileSync(this.chemin, "utf-8");
    const data = JSON.parse(contenu);
    const trouve = data.clients.find((c) => c.id === id);

    if (trouve === undefined) {
      throw new Error(`Aucun client avec l'id ${id} dans ${this.chemin}`);
    }

    // Transforme l'objet brut du JSON en vraie classe DONNÉE (la déstructuration
    // ignore les champs superflus comme `id`).
    return new InfoClient(trouve);
  }
}

module.exports = InfoClientSource;
