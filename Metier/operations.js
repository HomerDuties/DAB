// =============================================================================
// operations.js — LE CATALOGUE DES OPÉRATIONS DAB (pattern Command)
// =============================================================================
// Chaque GESTE du distributeur est une CLASSE qui HÉRITE d'Operation :
//   - elle porte SES DONNÉES (carte, code, montant, labels, destinataire...)
//   - elle porte LES CHOIX de SON TYPE : l'authentification exigée ou non,
//     les comptes à résoudre, LA classe métier à appeler, ce qu'elle retourne.
//
// C'est la traduction de « les choix portés par le type d'opération » :
// plutôt qu'un énorme switch (arborescence de choix) dans l'orchestrateur,
// chaque opération INCARNE son comportement par polymorphisme / héritage.
//
// Deux familles :
//   - OPÉRATIONS « POSTE » (par défaut) : exigent la carte + le code
//     (session, consultation, retrait, dépôt, virement...).
//   - OPÉRATIONS « BACK-OFFICE »       : exigeAuthentification() = false
//     (conversion, découvert, état client) : pas de carte, calculs purs.
//
// Chaque opération reçoit SES SERVICE(S) INJECTÉ(S) AU CONSTRUCTEUR, APRÈS ses
// données : new DepotOperation({ carte, code, labelCompte, montant },
// depotService). Elle « connaît » donc LE TYPE de service dont elle a besoin —
// le choix du bon exécutant reste dans LE TYPE, jamais dans un switch. Résultat :
// l'orchestrateur ne fait circuler AUCUN environnement de services.
// =============================================================================

class Operation {
  // Les opérations « poste » exigent la carte + son code (défaut : oui).
  // Les back-office (conversion, découvert...) retournent false.
  exigeAuthentification() {
    return true;
  }

  // Hook de préparation : l'opération résout les comptes dont elle a besoin
  // via `resolveur(client, label) -> Compte` (navigation → classe DONNÉE).
  // Par défaut : rien (ex. les back-office, qui apportent leurs données).
  prepareComptes(client, resolveur) {}

  // Le cœur polymorphe : l'opération appelle LA classe métier dont elle a reçu
  // le(s) service(s) au constructeur, et retourne les détails du « reçu ».
  executer() {
    throw new Error("Une opération doit implémenter executer().");
  }

  // Nom lisible du type (utilisé dans le reçu).
  getType() {
    return this.constructor.name;
  }
}

// -----------------------------------------------------------------------------
// 1. POSTE — vérification seule / session / lecture (aucun mouvement)
// -----------------------------------------------------------------------------

// Vérifie le code SANS lever d'erreur : c'est la « borne » d'informations.
class AuthentificationOperation extends Operation {
  constructor({ carte, code }, authenticateur) {
    super();
    this.carte = carte;
    this.code = code;
    this.authenticateur = authenticateur;
  }
  exigeAuthentification() {
    return false; // elle EST l'authentification, pas une opération à protéger
  }
  executer() {
    return { codeValide: this.authenticateur.valider(this.carte, this.code) };
  }
}

// Ouverture de session : carte → propriétaire → comptes (le reçu les liste).
class SessionOperation extends Operation {
  constructor({ carte, code }) {
    super();
    this.carte = carte;
    this.code = code;
  }
  executer() {
    return {}; // le reçu (client + comptes) suffit
  }
}

// Lecture du solde d'un compte (par label), ou de tous sans label.
class ConsultationOperation extends Operation {
  constructor({ carte, code, labelCompte }) {
    super();
    this.carte = carte;
    this.code = code;
    this.labelCompte = labelCompte;
  }
  prepareComptes(client, resolveur) {
    if (this.labelCompte) this.compte = resolveur(client, this.labelCompte);
  }
  executer() {
    return this.compte
      ? { label: this.labelCompte, solde: this.compte.getSolde() }
      : {};
  }
}

// -----------------------------------------------------------------------------
// 2. POSTE — mouvements d'argent (un service = une classe métier)
// -----------------------------------------------------------------------------

class DepotOperation extends Operation {
  constructor({ carte, code, labelCompte, montant }, depotService) {
    super();
    this.carte = carte;
    this.code = code;
    this.labelCompte = labelCompte;
    this.montant = montant;
    this.depotService = depotService;
  }
  prepareComptes(client, resolveur) {
    this.compte = resolveur(client, this.labelCompte);
  }
  executer() {
    this.depotService.deposer(this.montant, this.compte);
    return { montant: this.montant };
  }
}

class RetraitOperation extends Operation {
  constructor({ carte, code, labelCompte, montant }, retraitService) {
    super();
    this.carte = carte;
    this.code = code;
    this.labelCompte = labelCompte;
    this.montant = montant;
    this.retraitService = retraitService;
  }
  prepareComptes(client, resolveur) {
    this.compte = resolveur(client, this.labelCompte);
  }
  executer() {
    this.retraitService.retirer(this.montant, this.compte);
    return { montant: this.montant };
  }
}

class VirementOperation extends Operation {
  constructor({ carte, code, labelSource, labelCible, montant }, virementService) {
    super();
    this.carte = carte;
    this.code = code;
    this.labelSource = labelSource;
    this.labelCible = labelCible;
    this.montant = montant;
    this.virementService = virementService;
  }
  prepareComptes(client, resolveur) {
    this.source = resolveur(client, this.labelSource);
    this.cible = resolveur(client, this.labelCible);
  }
  executer() {
    this.virementService.effectuerVirement(this.montant, this.source, this.cible);
    return { montant: this.montant };
  }
}

class PaiementFactureOperation extends Operation {
  constructor({ carte, code, labelCompte, facture }, paiementFactureService) {
    super();
    this.carte = carte;
    this.code = code;
    this.labelCompte = labelCompte;
    this.facture = facture;
    this.paiementFactureService = paiementFactureService;
  }
  prepareComptes(client, resolveur) {
    this.compte = resolveur(client, this.labelCompte);
  }
  executer() {
    this.paiementFactureService.payerFacture(this.facture, this.compte);
    return { reference: this.facture.reference };
  }
}

class RetraitDeviseOperation extends Operation {
  constructor({ carte, code, labelCompte, montant, deviseCible }, convertisseurDevises, retraitService) {
    super();
    this.carte = carte;
    this.code = code;
    this.labelCompte = labelCompte;
    this.montant = montant;
    this.deviseCible = deviseCible;
    this.convertisseurDevises = convertisseurDevises;
    this.retraitService = retraitService;
  }
  prepareComptes(client, resolveur) {
    this.compte = resolveur(client, this.labelCompte);
  }
  executer() {
    // Conversion PUIS retrait : la composition est portée par le type
    // (deux services injectés au constructeur).
    const debite = this.convertisseurDevises.convertir(this.montant, this.deviseCible);
    this.retraitService.retirer(debite, this.compte);
    return { devise: this.deviseCible, debite };
  }
}

// -----------------------------------------------------------------------------
// 3. POSTE — RÈGLES COMPLEXES (plafonds, devises, multi-comptes)
// -----------------------------------------------------------------------------

class DepotPlafonneOperation extends Operation {
  constructor({ carte, code, labelCompte, montant }, depotPlafonneService) {
    super();
    this.carte = carte;
    this.code = code;
    this.labelCompte = labelCompte;
    this.montant = montant;
    this.depotPlafonneService = depotPlafonneService;
  }
  prepareComptes(client, resolveur) {
    this.compte = resolveur(client, this.labelCompte);
  }
  executer() {
    this.depotPlafonneService.deposer(this.montant, this.compte);
    return { montant: this.montant };
  }
}

class RetraitPlafonneOperation extends Operation {
  constructor({ carte, code, labelCompte, montant }, retraitPlafonneService) {
    super();
    this.carte = carte;
    this.code = code;
    this.labelCompte = labelCompte;
    this.montant = montant;
    this.retraitPlafonneService = retraitPlafonneService;
  }
  prepareComptes(client, resolveur) {
    this.compte = resolveur(client, this.labelCompte);
  }
  executer() {
    // Le service gère plafond + frais + mémoire ; le type porte le choix.
    return { resultat: this.retraitPlafonneService.retirer(this.montant, this.compte) };
  }
}

class VirementInternationalOperation extends Operation {
  constructor({ carte, code, labelSource, montant, deviseCible, compteCible }, virementInternationalService) {
    super();
    this.carte = carte;
    this.code = code;
    this.labelSource = labelSource;
    this.montant = montant;
    this.deviseCible = deviseCible;
    this.compteCible = compteCible; // compte EXTÉRIEUR fourni par le destinataire
    this.virementInternationalService = virementInternationalService;
  }
  prepareComptes(client, resolveur) {
    this.source = resolveur(client, this.labelSource);
  }
  executer() {
    this.virementInternationalService.effectuerVirement(
      this.montant,
      this.source,
      this.compteCible,
      this.deviseCible
    );
    return {
      compteCible: {
        label: this.compteCible.label,
        solde: this.compteCible.getSolde(),
      },
    };
  }
}

class VirementInterClientOperation extends Operation {
  constructor({ carte, code, labelSource, clientCible, labelCible, montant, devise }, virementInterClientService) {
    super();
    this.carte = carte;
    this.code = code;
    this.labelSource = labelSource;
    this.clientCible = clientCible; // le Client receveur (via l'annuaire)
    this.labelCible = labelCible;
    this.montant = montant;
    this.devise = devise;
    this.virementInterClientService = virementInterClientService;
  }
  prepareComptes(client, resolveur) {
    this.source = resolveur(client, this.labelSource);
    this.cible = resolveur(this.clientCible, this.labelCible);
  }
  executer() {
    const resultat = this.virementInterClientService.effectuerVirement(
      this.source,
      this.cible,
      this.montant,
      this.devise
    );
    return {
      resultat,
      compteCible: { label: this.cible.label, solde: this.cible.getSolde() },
    };
  }
}

// -----------------------------------------------------------------------------
// 4. BACK-OFFICE — sans carte ni code (calculs purs, consultation)
// -----------------------------------------------------------------------------

class ConversionOperation extends Operation {
  constructor({ montant, deviseCible }, convertisseurDevises) {
    super();
    this.montant = montant;
    this.deviseCible = deviseCible;
    this.convertisseurDevises = convertisseurDevises;
  }
  exigeAuthentification() {
    return false;
  }
  executer() {
    return {
      converti: this.convertisseurDevises.convertir(this.montant, this.deviseCible),
      devise: this.deviseCible,
    };
  }
}

class DecouvertOperation extends Operation {
  constructor({ profil }, evaluateurProfil, calculateurDecouvert) {
    super();
    this.profil = profil;
    this.evaluateurProfil = evaluateurProfil;
    this.calculateurDecouvert = calculateurDecouvert;
  }
  exigeAuthentification() {
    return false;
  }
  executer() {
    // Acte 1 : évaluer le profil → facteur ; acte 2 : décider le montant.
    const facteur = this.evaluateurProfil.evaluer(this.profil);
    const decouvert = this.calculateurDecouvert.calculerDecouvert(
      this.profil.getTypeCompte(),
      this.profil.getRevenuMensuel(),
      facteur
    );
    return { facteur, decouvert };
  }
}

class DecouvertGlobalOperation extends Operation {
  constructor({ client, demande }, evaluateurProfil, calculateurDecouvertGlobal) {
    super();
    this.client = client;
    this.demande = demande;
    this.evaluateurProfil = evaluateurProfil;
    this.calculateurDecouvertGlobal = calculateurDecouvertGlobal;
  }
  exigeAuthentification() {
    return false;
  }
  executer() {
    const facteur = this.evaluateurProfil.evaluer(this.client.getProfile());
    return this.calculateurDecouvertGlobal.calculer(this.client, this.demande, facteur);
  }
}

class EtatClientOperation extends Operation {
  constructor({ client }) {
    super();
    this.client = client;
  }
  exigeAuthentification() {
    return false;
  }
  executer() {
    const c = this.client;
    const comptes = c.getComptes().map((x) => ({ label: x.label, type: x.type, solde: x.getSolde() }));
    return {
      nom: c.getInfoClient().getNom(),
      email: c.getInfoClient().getEmail(),
      score: c.getProfile().getScoreFiabilite(),
      comptes,
      soldeTotal: c.soldeTotal(),
    };
  }
}

module.exports = {
  Operation,
  AuthentificationOperation,
  SessionOperation,
  ConsultationOperation,
  DepotOperation,
  RetraitOperation,
  VirementOperation,
  PaiementFactureOperation,
  RetraitDeviseOperation,
  DepotPlafonneOperation,
  RetraitPlafonneOperation,
  VirementInternationalOperation,
  VirementInterClientOperation,
  ConversionOperation,
  DecouvertOperation,
  DecouvertGlobalOperation,
  EtatClientOperation,
};


