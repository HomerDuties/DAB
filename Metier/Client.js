// =============================================================================
// Client — Classe DONNÉE composite (identité + profil + comptes d'un client)
// =============================================================================
// Décision d'architecture actée (21/09/2026) : les comptes restent COMPOSÉS
// dans Client (navigation unidirectionnelle client.getCompte(label)).
// L'alternative « annuaire ReferentielCompte » a été comparée puis ÉCARTÉE
// (pas de besoin de navigation compte→client aujourd'hui) — cf. le POC
// memo/_poc_referentiel_compte.js.
// Décision d'architecture actée (21/09/2026) : l'InfoClient est chargé en AUTOMATIQUE
// par Client lui-même et NON injecté.
// Justification : l'identité est une dépendance VITALE — un Client ne peut PAS exister
// sans son InfoClient ; l'injecter reviendrait à répéter une évidence à chaque création.
// On internalise donc les dépendances ESSENTIELLES ; seules les dépendances CONTEXTUELLES
// (services, politiques…) sont injectées.
// Décision ACTÉE puis TENUE (21/09/2026) : pour permettre à la source de varier, Client
// passe par la FABRIQUE FabriqueInfoClientSource (point unique de choix — « fichier »
// par défaut, « memoire » possible). Client ne connaît que le CONTRAT `trouverParId(id)
// -> InfoClient` : il ignore la source concrète, sans que le flux ne soit injecté.
// Répond au « QUOI ? » : qu'est-ce qu'un client pour les règles métier ?
// Un client = son identité (InfoClient) + son profil (ClientProfile) + TOUS ses
// comptes. On regroupe ces données dans UN SEUL objet pour pouvoir le faire
// circuler tel quel (plutôt que de passer « info + profil + solde courant + ... »).
//
// Rôle dans la gestion fine des paramètres :
//   C'est un Parameter Object : au lieu de 3-4 paramètres éparpillés, les
//   méthodes reçoivent le Client ENTIER (ex. CalculateurDecouvertGlobal).
//
// Constructeur (essentiels pour exister) :
//   - id       : l'identifiant du client. L'objet InfoClient (nom, email, ...)
//                est chargé AUTOMATIQUEMENT via la source choisie par la fabrique
//                (défaut : clients.json).
//                → dépendance VITALE internalisée (décision actée en tête de fichier) :
//                  « un Client n'existe pas sans identité » — on ne l'injecte donc pas.
//   - profile  : un objet ClientProfile (profil du client)
//   - comptes  : un OBJET `{ label: Compte }` (tous ses comptes)
// =============================================================================

const FabriqueInfoClientSource = require("./FabriqueInfoClientSource.js");

class Client {
  constructor(id, profile, comptes) {
    // La fabrique choisit la source d'infos (défaut : fichier clients.json).
    const clientInfoSource = new FabriqueInfoClientSource().creer();
    // Si aucun client ne porte cet id, la source LÈVE une erreur explicite :
    // « Aucun client avec l'id X dans ... » → jamais de Client « orphelin ».
    this.infoClient = clientInfoSource.trouverParId(id)
    this.profile = profile;
    this.comptes = comptes;
  }

  getInfoClient() { return this.infoClient; }
  getProfile() { return this.profile; }
  getComptes() { return Object.values(this.comptes); }

  getCompte(label){
    if(this.comptes[label] === undefined)
      throw new Error(`Aucun compte avec le label ${label} existant pour le client ${this.infoClient.getNom()}`)
    return this.comptes[label]
  }
  // Agrégation : la somme des soldes de TOUS les comptes du client.
  // Petite logique utile ET légitime ici — elle ne fait que lire les données
  // qu'elle porte (aucune règle métier de décision).
  soldeTotal() {
    return Object.values(this.comptes).reduce((total, compte) => total + compte.getSolde(), 0);
  }
}

module.exports = Client;
