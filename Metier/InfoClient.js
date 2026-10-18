// =============================================================================
// InfoClient — Classe DONNÉE (identité civile du client)
// =============================================================================
// Répond au « QUI ? » : qui est ce client ? (nom, email, adresse, téléphone).
// C'est un OBJET PARAMÈTRE au même titre que ClientProfile : il regroupe des
// données qui voyagent ensemble, au lieu de nom/email/adresse/tel séparés.
//
// AUCUNE règle ici : uniquement des données + getters (navigation). L'usage de
// ces données est la responsabilité des classes MÉTIER.
//
// Remarque : cette classe ne sait PAS d'où viennent ses données — c'est le
// rôle d'InfoClientSource (source de données) de les produire. Représentation
// (où l'info vit) et acquisition (d'où l'info vient) sont deux rôles distincts.
// =============================================================================

class InfoClient {
  constructor({ nom, email, adresse, tel }) {
    this.nom = nom;
    this.email = email;
    this.adresse = adresse;
    this.tel = tel;
  }

  getNom() { return this.nom; }
  getEmail() { return this.email; }
  getAdresse() { return this.adresse; }
  getTel() { return this.tel; }
}

module.exports = InfoClient;
