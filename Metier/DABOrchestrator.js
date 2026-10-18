// =============================================================================
// DABOrchestrator — ORCHESTRATEUR (une seule méthode : executer)
// =============================================================================
// Responsabilité unique : ENCHAÎNER, dans l'ORDRE LOGIQUE d'une utilisation du
// distributeur, les étapes que les classes MÉTIER exécutent réellement :
//
//     1. AUTHENTIFICATION   — carte + code (Authenticateur = politique,
//                             annuaire catalogueClients = propriétaire)
//     2. SÉLECTION/PRÉP      — l'opération résout les comptes dont elle a
//                             besoin (Client.getCompte(label) = navigation)
//     3. EXÉCUTION           — l'opération appelle LA classe métier de son
//                             type (retrait, dépôt, virement...)
//     4. REÇU                — identité + état des comptes (si op. « poste »)
//     5. RESTITUTION CARTE   — fin logique du distributeur (si carte)
//
// MINIMUM D'ARBORESCENCES DE CHOIX : il n'y a ICI ni switch, ni if en cascade.
// Les choix sont portés PAR LE TYPE d'opération (polymorphisme / héritage) :
//   - exigeAuthentification()  → auth ou pas (décidé par la classe)
//   - prepareComptes(...)      → quels comptes résoudre (décidé par la classe)
//   - executer()               → quelle classe métier appeler (le service reçu
//                                au CONSTRUCTEUR — voir operations.js)
// L'orchestrateur ne connaît que le CONTRAT commun « Operation ».
//
// UNE SEULE MÉTHODE PUBLIQUE : executer(operation). Ce n'est pas une façade à
// méthodes multiples (authentifier / ouvrirSession / listerComptes...).
//
// DÉPENDANCES INJECTÉES (constructeur — Parameter Object `deps`) :
//   - contexte : catalogueClients (annuaire id → Client)
//   - sécurité : authenticateur
// Aucun ENVIRONNEMENT de services n'est injecté ici : chaque opération reçoit
// SES services DANS SON CONSTRUCTEUR (operations.js). L'orchestrateur ne garde
// que l'identification (auth + annuaire) et le contrat commun « Operation ».
// =============================================================================

class DABOrchestrator {
  constructor(deps) {
    this.authenticateur = deps.authenticateur;
    this.catalogueClients = deps.catalogueClients;
  }

  // ================================================================
  // LA MÉTHODE UNIQUE — le déroulé chronologique du distributeur.
  // ================================================================
  executer(operation) {
    debugger; // ⑤ (ALLER — LES VRAIES RÈGLES MÉTIER) — une OPÉRATION arrive au domaine.
    // ↑ Remarque : insérer la carte, taper le code ou naviguer ne passent PAS ici.
    //   Seul un geste « à effet » (consulter, retirer, déposer, virer, payer) atteint
    //   ce point. `operation` porte déjà ses services ; son TYPE décide des étapes
    //   (F11 pour suivre : authentification → préparation → exécution → reçu → carte).
    // 1. AUTHENTIFICATION (si le type d'opération l'exige).
    const client = this._identifier(operation);

    // 2. PRÉPARATION : l'opération résout ses comptes (navigation par label).
    operation.prepareComptes(client, (proprietaire, label) => proprietaire.getCompte(label));

    // 3. EXÉCUTION : polymorphisme pur — l'opération appelle SA classe métier.
    //    (elle porte déjà SES services, injectés à sa construction)
    const details = operation.executer();

    // 4. REÇU (si opération « poste » : identité + état des comptes).
    const recu = { type: operation.getType(), ...details };
    if (operation.exigeAuthentification()) {
      recu.client = client.getInfoClient().getNom();
      recu.comptes = client.getComptes().map((c) => ({
        label: c.label,
        type: c.type,
        solde: c.getSolde(),
      }));
    }

    // 5. RESTITUTION DE LA CARTE (fin logique, si le DAB l'a insérée).
    if (operation.exigeAuthentification()) {
      recu.restitutionCarte = true;
    }
    return recu;
  }

  // ---- étape commune 1 : valider la carte + son code, résoudre le propriétaire.
  //      Retourne null pour les opérations back-office (pas de carte).
  _identifier(operation) {
    if (!operation.exigeAuthentification()) {
      return null; // l'opération porte ses propres données (profil, client...)
    }
    if (!this.authenticateur.valider(operation.carte, operation.code)) {
      throw new Error("Authentification échouée : code invalide.");
    }
    const proprietaire = this.catalogueClients[operation.carte.getIdProprietaire()];
    if (!proprietaire) {
      throw new Error(`Aucun client associé à la carte ${operation.carte.getNumero()}.`);
    }
    return proprietaire;
  }
}

module.exports = DABOrchestrator;
