// =============================================================================
// core-manager.js — LE CORE DE L'APPLI WEB : porte d'entrée entre le FRONT et le BACK
// =============================================================================
// RÔLE — LA PORTE D'ENTRÉE entre le FRONT (web/public) et le BACK (DAB/*) :
// il est CENTRAL : il reçoit les ACTIONS du front (insérer la carte, taper un
// chiffre, valider, choisir une opération…), les AIGUILLE vers le bon gestionnaire
// d'écran (table _gestionnaires + phase autorisée) et DIRIGE l'ÉTAT de l'APPLI
// (this.etat → un objet JSON sérialisable que la vue n'a plus qu'à afficher).
//
// LES 3 ACTEURS (cf. CLINE.md — « articulation d'une interface graphique ») :
//   1. BACK  (DOMAINE, INTOUCHÉ) : ../../Metier/*.js — les vraies règles bancaires.
//   2. CORE  (ICI)               : reçoit + aiguille + dirige l'état. Il CONSTRUIT
//      les opérations du catalogue (../../Metier/operations.js) avec LEURS services déjà
//      injectés, puis appelle UNE SEULE méthode du BACK : orchestreur.executer(operation).
//   3. FRONT (web/public/*)      : la vue (dab-ui.js) + le requêteur HTTP
//      (front-action-dealer.js).
//
// TESTABLE SANS FRONT : pilotez le core par agir(action, payload) et lisez
// etatCourant() → cf. web/test-core-manager.js (aucun navigateur requis).
//
// PREMIÈRE VERSION — PÉRIMÈTRE DÉLIBÉRÉ : les 5 opérations simples.
// Le PIN validé reste PRIVÉ (jamais sérialisé). La carte reste « insérée »
// jusqu'à rendreCarte, comme sur un vrai distributeur.
// =============================================================================

const {
  SessionOperation,
  ConsultationOperation,
  DepotOperation,
  RetraitOperation,
  VirementOperation,
  PaiementFactureOperation,
} = require("../../Metier/operations.js");

// =============================================================================
// CORE — classe CoreManager (reçoit, aiguille et dirige l'état de l'appli)
// =============================================================================
class CoreManager {
  // ---------------------------------------------------------------------------
  // ASSEMBLAGE : tout est INJECTÉ au constructeur (le core ne construit rien,
  // pour rester 100 % testable). Paramètres (Parameter Object `deps`) :
  //   - orchestreur : DABOrchestrator (auth + annuaire + executer)
  //   - services    : { retrait, depot, virement, paiementFacture } — les classes
  //                   métier opérationnelles, déjà composées par l'assembleur
  //   - cartes      : [ { id, numero, proprietaire, instance } ] — les cartes
  //                   « dans le sas » du DAB (instance = CarteBancaire réelle)
  //   - factures    : [ Facture ] — les factures scannées / en attente de paiement
  // ---------------------------------------------------------------------------
  constructor({ orchestreur, services, cartes, factures }) {
    for (const nom of ["retrait", "depot", "virement", "paiementFacture"]) {
      if (!services?.[nom]) throw new Error(`CoreManager : service « ${nom} » manquant.`);
    }
    if (!orchestreur?.executer) throw new Error("CoreManager : orchestrateur invalide.");
    if (!Array.isArray(cartes) || cartes.length === 0) throw new Error("CoreManager : aucune carte disponible.");
    if (!Array.isArray(factures)) throw new Error("CoreManager : liste de factures invalide.");

    this.orchestreur = orchestreur;
    this.services = services;
    this.cartes = cartes;
    this.factures = factures;

    // Registres PRIVÉS (jamais sérialisés ni exposés à la vue) :
    this._cartesParId = new Map(cartes.map((c) => [c.id, c]));
    this._facturesParReference = new Map(factures.map((f) => [f.reference, f]));
    this._carteInseree = null; // l'instance CarteBancaire en cours (elle porte le PIN)
    this._code = null;         // le PIN validé — propriété privée du core

    // Table de TRANSITIONS : action → phases d'écran où elle est légale. C'est
    // la « carte » des gestes possibles selon l'écran affiché (pas de if en
    // cascade : chaque action connaît ses autorisations).
    this._gestionnaires = {
      insererCarte:       { phases: ["accueil"],                        fn: (p) => this.insererCarte(p) },
      chiffre:            { phases: ["saisie_code", "saisie_montant"],  fn: (p) => this.chiffre(p) },
      effacer:            { phases: ["saisie_code", "saisie_montant"],  fn: () => this.effacer() },
      valider:            { phases: ["saisie_code", "saisie_montant"],  fn: () => this.valider() },
      annuler:            { phases: ["saisie_code", "choix_compte", "choix_compte_cible", "saisie_montant", "choix_facture"], fn: () => this.annuler() },
      choisirOperation:   { phases: ["menu"],                           fn: (p) => this.choisirOperation(p) },
      choisirCompte:      { phases: ["choix_compte"],                   fn: (p) => this.choisirCompte(p) },
      choisirCompteCible: { phases: ["choix_compte_cible"],             fn: (p) => this.choisirCompteCible(p) },
      choisirFacture:     { phases: ["choix_facture"],                  fn: (p) => this.choisirFacture(p) },
      continuer:          { phases: ["resultat"],                       fn: () => this.continuer() },
      rendreCarte:        { phases: ["menu", "resultat"],               fn: () => this.rendreCarte() },
    };

    // L'état de départ : écran d'accueil, aucune carte insérée.
    this.etat = this._etatInitial();
  }

  // ---------------------------------------------------------------------------
  // POINT D'ENTRÉE UNIQUE : agir(action, payload) → NOUVEL ÉTAT (cloné).
  // C'est le seul contrat côté vue : { action, ...payload } → état JSON.
  // Le core ne lève JAMAIS d'erreur pour un geste utilisateur : toute erreur
  // (métier ou de navigation) est rangée dans `etat.erreur` et affichée à
  // l'écran. La vue (ou le serveur) ne fait qu'appeler agir — jamais l'inverse.
  // ---------------------------------------------------------------------------
  agir(action, payload = {}) {
    const entree = this._gestionnaires[action];
    debugger; // ④ (ALLER) — le CERVEAU reçoit l'action : il cherche le gestionnaire d'écran.
    // ↑ Inspecte `action` (ex. "chiffre"), `payload`, et `entree` (le gestionnaire
    //   pour l'écran courant). Geste inconnu ou hors phase → géré juste en dessous.
    if (!entree || !entree.phases.includes(this.etat.screen)) {
      this.etat.erreur = entree
        ? `Action « ${action} » impossible en phase « ${this.etat.screen} ».`
        : `Action « ${action} » non implémentée.`;
      return this.etatCourant();
    }
    this.etat.erreur = null; // un geste légitime représente une nouvelle intention
    debugger; // ④b (ALLER) — on EXÉCUTE le gestionnaire choisi : il modifie `this.etat`.
    // ↑ Entre dans la fonction (F11) pour voir le changement d'écran (saisie, choix…).
    //   Seuls les `_gestionnaires` modifient l'état ; le reste du core le lit.
    entree.fn(payload);
    return this.etatCourant();
  }

  // Copie STRICTE de l'état (aucun objet vivant du domaine ne fuit) : c'est
  // exactement le JSON que le serveur enverra à la vue.
  etatCourant() {
    debugger; // ⑥ (RETOUR) — copie STRICTE de l'état avant de le renvoyer.
    // ↑ `this.etat` = le nouvel écran ; le JSON retourné est exactement ce que le
    //   serveur enverra au navigateur (aucun objet du domaine ne peut fuir).
    return JSON.parse(JSON.stringify(this.etat));
  }

  // =========================================================================
  // ÉTAT INITIAL & NAVIGATION ENTRE ÉCRANS (les changements de phase)
  // =========================================================================

  // L'écran d'accueil : feuille blanche, aucune carte, aucun secret.
  _etatInitial() {
    return {
      screen: "accueil",
      message: "Bienvenue au DAB. Insérez votre carte (démo : Martin, code 1234).",
      erreur: null,
      saisie: "",                // chiffres en cours de saisie (PIN ou montant)
      typeSaisie: null,          // "pin" | "montant" | null → comment la vue affiche
      paveNumerique: false,      // la vue montre-t-elle le clavier physique ?
      validerLabel: null,        // libellé du bouton VALIDER contextuel ("Valider le code", "Confirmer…")
      carte: null,               // { numero masqué, proprietaire } si carte insérée
      client: null,              // nom du client en session (après saisie du code)
      comptes: [],               // [{ label, type, solde }] — les soldes à l'écran
      operationEnCours: null,    // "consulter" | "retirer" | "deposer" | "virer" | "payer"
      contexte: { labelCompte: null, labelCible: null, montant: null, facture: null },
      options: [{ action: "insererCarte", label: "💳 Insérer ma carte", payload: {} }],
      recu: null,                // { entete, lignes: [{ label, valeur }] } du dernier reçu
    };
  }

  _allerAccueil(message) {
    this.etat = this._etatInitial(); // on repart d'une feuille blanche
    if (message) this.etat.message = message; // message de remerciement le cas échéant
  }

  _allerSaisieCode(message) {
    this.etat.screen = "saisie_code";
    this.etat.message = message;
    this.etat.erreur = null;
    this.etat.saisie = "";
    this.etat.typeSaisie = "pin";
    this.etat.paveNumerique = true;
    this.etat.validerLabel = "Valider le code";
    this.etat.options = [{ action: "annuler", label: "↩️ Retirer ma carte" }];
  }

  // Le menu principal : les 5 opérations simples + rendre la carte.
  _allerMenu(message) {
    this.etat.screen = "menu";
    this.etat.message = message;
    this.etat.erreur = null;
    this.etat.saisie = "";
    this.etat.typeSaisie = null;
    this.etat.paveNumerique = false;
    this.etat.validerLabel = null;
    this.etat.operationEnCours = null;
    this.etat.contexte = { labelCompte: null, labelCible: null, montant: null, facture: null };
    this.etat.recu = null;
    this.etat.options = [
      { action: "choisirOperation", label: "👁 Consulter mes comptes",  payload: { operation: "consulter" } },
      { action: "choisirOperation", label: "💵 Retirer des espèces",    payload: { operation: "retirer" } },
      { action: "choisirOperation", label: "💶 Déposer de l'argent",    payload: { operation: "deposer" } },
      { action: "choisirOperation", label: "🔁 Virement entre comptes", payload: { operation: "virer" } },
      { action: "choisirOperation", label: "🧾 Payer une facture",      payload: { operation: "payer" } },
      { action: "rendreCarte", label: "⬅️ Rendre la carte et terminer" },
    ];
  }

  // Choix du compte (retirer, déposer, virer, payer) — puisque l'écran est un
  // DAB et que la liste des comptes vient du domaine, ce sont les VRAIS soldes.
  _allerChoixCompte(messageTitre) {
    this.etat.screen = "choix_compte";
    this.etat.message = messageTitre;
    this.etat.erreur = null;
    this.etat.saisie = "";
    this.etat.typeSaisie = null;
    this.etat.paveNumerique = false;
    this.etat.validerLabel = null;
    this.etat.recu = null;
    this.etat.options = [
      ...this.etat.comptes.map((c) => ({
        action: "choisirCompte",
        label: `💶 ${c.label} — ${this._euros(c.solde)}`,
        payload: { label: c.label },
      })),
      { action: "annuler", label: "↩️ Retour au menu" },
    ];
  }

  // 2e choix pour le virement : la destination (la source est déjà choisie).
  _allerChoixCompteCible() {
    const de = this.etat.contexte.labelCompte;
    this.etat.screen = "choix_compte_cible";
    this.etat.message = `Virement depuis « ${de} » — vers quel compte ?`;
    this.etat.erreur = null;
    this.etat.recu = null;
    this.etat.options = [
      ...this.etat.comptes
        // On retire la source : virer vers le même compte est un refus métier
        // (cf. VirementService) — autant ne pas le proposer sur l'écran.
        .filter((c) => c.label !== de)
        .map((c) => ({
          action: "choisirCompteCible",
          label: `🎯 ${c.label} — ${this._euros(c.solde)}`,
          payload: { label: c.label },
        })),
      { action: "annuler", label: "↩️ Retour au menu" },
    ];
  }

  // Saisie du montant (retirer, déposer, virer) : clavier numérique + VALIDER.
  _allerSaisieMontant(messageTitre) {
    this.etat.screen = "saisie_montant";
    this.etat.message = messageTitre;
    this.etat.erreur = null;
    this.etat.saisie = "";
    this.etat.typeSaisie = "montant";
    this.etat.paveNumerique = true;
    this.etat.validerLabel = "Confirmer le montant";
    this.etat.recu = null;
    this.etat.options = [{ action: "annuler", label: "↩️ Retour au menu" }];
  }

  // Choix de la facture à payer (chaque facture porte déjà son montant).
  _allerChoixFacture() {
    this.etat.screen = "choix_facture";
    this.etat.message = "Quelle facture voulez-vous payer ?";
    this.etat.erreur = null;
    this.etat.recu = null;
    this.etat.options = [
      ...this.factures.map((f) => ({
        action: "choisirFacture",
        label: `🧾 ${f.reference} — ${this._euros(f.montant)}`,
        payload: { reference: f.reference },
      })),
      { action: "annuler", label: "↩️ Retour au menu" },
    ];
  }

  // Écran final : le reçu de l'opération (détails + soldes après opération).
  _allerResultat(recu) {
    this.etat.screen = "resultat";
    this.etat.message = "✅ Opération réussie";
    this.etat.erreur = null;
    this.etat.saisie = "";
    this.etat.typeSaisie = null;
    this.etat.paveNumerique = false;
    this.etat.validerLabel = null;
    this.etat.recu = {
      entete: `Reçu — ${recu.type}`,
      lignes: this._construireLignesRecu(recu),
    };
    this.etat.options = [
      { action: "continuer", label: "↩️ Retour au menu" },
      { action: "rendreCarte", label: "⬅️ Rendre la carte et terminer" },
    ];
  }

  // Fin logique du DAB : la carte sort, la session s'efface, retour à l'accueil.
  _rendreCarte(message) {
    this._carteInseree = null;
    this._code = null;
    this._allerAccueil(message);
  }

  // =========================================================================
  // LES ACTIONS UTILISATEUR (invoquées par agir() via la table de transitions)
  // =========================================================================

  // Le client pousse sa carte dans le sas (accueil → saisie du code).
  insererCarte({ carteId } = {}) {
    const carte = this._cartesParId.get(carteId) ?? this.cartes[0];
    if (!carte) {
      this.etat.erreur = "Aucune carte disponible dans le sas.";
      return;
    }
    this._carteInseree = carte.instance; // l'instance réelle (elle porte le PIN)
    this.etat.carte = {
      numero: this._masquerNumero(carte.numero),
      proprietaire: carte.proprietaire,
    };
    this._allerSaisieCode(`Bonjour ${carte.proprietaire} — entrez votre code.`);
  }

  // Une touche du clavier numérique (PIN ou montant selon la phase en cours).
  chiffre({ chiffre } = {}) {
    const touche = String(chiffre);
    if (!/^\d$/.test(touche)) {
      this.etat.erreur = "Touche invalide.";
      return;
    }
    const plafond = this.etat.typeSaisie === "pin" ? 4 : 12;
    if (this.etat.saisie.length >= plafond) return; // un vrai DAB ignore le trop
    this.etat.erreur = null;
    this.etat.saisie += touche;
  }

  // La touche EFFACER : retire le dernier chiffre saisi.
  effacer() {
    if (this.etat.saisie.length > 0) {
      this.etat.saisie = this.etat.saisie.slice(0, -1);
      this.etat.erreur = null;
    }
  }

  // La touche VALIDER : selon l'écran, on soumet le PIN ou le montant.
  valider() {
    if (this.etat.screen === "saisie_code") return this._validerCode();
    if (this.etat.screen === "saisie_montant") return this._validerMontantEtExecuter();
    this.etat.erreur = "La validation n'est pas attendue ici.";
  }

  // La touche ANNULER : abandon contextuel (sans rendre la carte au menu).
  annuler() {
    if (this.etat.screen === "saisie_code") {
      this._rendreCarte("🎫 Carte retirée. Merci de votre visite."); // avant le code
      return;
    }
    // Sur les écrans intermédiaires : retour au menu, session conservée.
    this._allerMenu(this._messageMenu());
  }

  // Depuis le menu : choix d'une des 5 opérations simples.
  choisirOperation({ operation } = {}) {
    if (!["consulter", "retirer", "deposer", "virer", "payer"].includes(operation)) {
      this.etat.erreur = `Opération « ${operation} » inconnue.`;
      return;
    }
    this.etat.operationEnCours = operation;
    if (operation === "consulter") return this._executerConsultation(); // lecture immédiate
    if (operation === "virer")     return this._allerChoixCompte("Le virement part de quel compte ?");
    if (operation === "retirer")   return this._allerChoixCompte("Sur quel compte retirer ?");
    if (operation === "deposer")   return this._allerChoixCompte("Sur quel compte déposer ?");
    this._allerChoixCompte("Depuis quel compte payer la facture ?");
  }

  // Choix du premier compte (source ou compte concerné selon l'opération).
  choisirCompte({ label } = {}) {
    if (!this.etat.comptes.some((c) => c.label === label)) {
      this.etat.erreur = `Compte « ${label} » inconnu.`;
      return;
    }
    this.etat.contexte.labelCompte = label;
    const op = this.etat.operationEnCours;
    if (op === "virer")   return this._allerChoixCompteCible();
    if (op === "payer")   return this._allerChoixFacture();
    if (op === "retirer") return this._allerSaisieMontant(`Montant à retirer de « ${label} » :`);
    this._allerSaisieMontant(`Montant à déposer sur « ${label} » :`);
  }

  // Choix du compte de destination (virement uniquement).
  choisirCompteCible({ label } = {}) {
    if (!this.etat.comptes.some((c) => c.label === label)) {
      this.etat.erreur = `Compte « ${label} » inconnu.`;
      return;
    }
    if (label === this.etat.contexte.labelCompte) {
      this.etat.erreur = "Choisissez un AUTRE compte que la source.";
      return;
    }
    this.etat.contexte.labelCible = label;
    const de = this.etat.contexte.labelCompte;
    this._allerSaisieMontant(`Montant à virer de « ${de} » vers « ${label} » :`);
  }

  // Choix d'une facture (elle porte son montant → exécution immédiate).
  choisirFacture({ reference } = {}) {
    const facture = this._facturesParReference.get(reference);
    if (!facture) {
      this.etat.erreur = `Facture « ${reference} » inconnue.`;
      return;
    }
    this.etat.contexte.facture = { reference: facture.reference, montant: facture.montant };
    this._executerOperation();
  }

  // Depuis le reçu : retour au menu (la carte reste insérée).
  continuer() {
    this._allerMenu(this._messageMenu());
  }

  // Depuis le menu ou le reçu : sortie du DAB.
  rendreCarte() {
    this._rendreCarte("🎫 Carte rendue. Merci de votre visite !");
  }

  // =========================================================================
  // CŒUR : LE SEUL ENDROIT OÙ LE CORE APPELLE LE MÉTIER (orchestreur)
  // =========================================================================

  // Soumission du code : le domaine authentifie (le compteur d'échecs et le
  // blocage éventuel vivent dans Authenticateur). En cas de succès, le client
  // et la liste de ses comptes viennent DU DOMAINE.
  _validerCode() {
    const code = this.etat.saisie;
    if (code.length !== 4) {
      this.etat.erreur = "Le code doit comporter 4 chiffres.";
      return;
    }
    try {
      const recu = this.orchestreur.executer(new SessionOperation({ carte: this._carteInseree, code }));
      this._code = code;                 // mémorisé pour les opérations suivantes
      this.etat.client = recu.client;    // le nom vient du domaine (clients.json)
      this.etat.comptes = recu.comptes;  // la liste des comptes vient du domaine
      this.etat.saisie = "";
      this.etat.erreur = null;
      this._allerMenu(this._messageMenu());
    } catch (err) {
      this.etat.saisie = "";
      this.etat.erreur = err.message; // « code invalide » / carte bloquée (compteur auth)
    }
  }

  // Soumission du montant saisi au clavier, puis exécution de l'opération.
  _validerMontantEtExecuter() {
    const montant = parseInt(this.etat.saisie, 10);
    if (!Number.isFinite(montant) || montant <= 0) {
      this.etat.erreur = "Saisissez un montant en euros (entier > 0).";
      return;
    }
    this.etat.contexte.montant = montant;
    this._executerOperation();
  }

  // Exécution métier d'une opération en cours (construction puis orchestreur).
  _executerOperation() {
    try {
      const recu = this.orchestreur.executer(this._construireOperation());
      this.etat.comptes = recu.comptes; // soldes rafraîchis PAR LE DOMAINE
      this._allerResultat(recu);
    } catch (err) {
      // On reste sur l'écran courant (saisie du montant ou choix de la facture)
      // pour permettre la correction (ex. « Fonds insuffisants. »).
      this.etat.erreur = err.message;
    }
  }

  // La consultation est une LECTURE : exécutée dès le choix au menu.
  _executerConsultation() {
    try {
      const recu = this.orchestreur.executer(
        new ConsultationOperation({ carte: this._carteInseree, code: this._code })
      );
      this.etat.comptes = recu.comptes;
      this._allerResultat(recu);
    } catch (err) {
      this.etat.erreur = err.message;
    }
  }

  // Construit l'opération du catalogue correspondant à operationEnCours, avec
  // LES SERVICES déjà injectés (les choix sont portés par LE TYPE, cf. domaine).
  _construireOperation() {
    const de = this.etat.contexte;
    const base = { carte: this._carteInseree, code: this._code };
    switch (this.etat.operationEnCours) {
      case "retirer":
        return new RetraitOperation({ ...base, labelCompte: de.labelCompte, montant: de.montant }, this.services.retrait);
      case "deposer":
        return new DepotOperation({ ...base, labelCompte: de.labelCompte, montant: de.montant }, this.services.depot);
      case "virer":
        return new VirementOperation({ ...base, labelSource: de.labelCompte, labelCible: de.labelCible, montant: de.montant }, this.services.virement);
      case "payer":
        return new PaiementFactureOperation(
          { ...base, labelCompte: de.labelCompte, facture: this._facturesParReference.get(de.facture.reference) },
          this.services.paiementFacture
        );
      default:
        throw new Error("Aucune opération en cours à exécuter.");
    }
  }

  // =========================================================================
  // PETITS OUTILS DE PRÉSENTATION (aucune logique métier ici)
  // =========================================================================

  // Transforme le reçu brut du domaine (pas de champ « lignes » pour les 5
  // opérations simples) en reçu d'écran : détails de l'opération + soldes APRÈS.
  _construireLignesRecu(recu) {
    const lignes = [];
    if (recu.solde !== undefined)    lignes.push({ label: "Solde", valeur: this._euros(recu.solde) });
    if (recu.montant !== undefined)  lignes.push({ label: "Montant", valeur: this._euros(recu.montant) });
    if (recu.reference)              lignes.push({ label: "Référence", valeur: String(recu.reference) });
    if (recu.client)                 lignes.push({ label: "Client", valeur: recu.client });
    // Le cas échéant, les lignes brutes du domaine (futures opérations riches).
    for (const l of recu.lignes ?? []) lignes.push({ label: l.label, valeur: String(l.valeur) });
    // Toujours : l'état des soldes après l'opération (soldes validés par le domaine).
    for (const compte of this.etat.comptes) {
      lignes.push({ label: `Solde « ${compte.label} »`, valeur: this._euros(compte.solde) });
    }
    return lignes;
  }

  // Message de bienvenue du menu, avec le client de la session (du domaine).
  _messageMenu() {
    return this.etat.client ? `Bonjour ${this.etat.client} — que souhaitez-vous faire ?` : "Le menu n'est pas accessible.";
  }

  // Format euro de présentation (cf. main.js : les montants restent des entiers).
  _euros(montant) {
    return `${montant.toLocaleString("fr-FR")} €`;
  }

  // Masque le numéro de carte : seuls les 4 derniers chiffres restent visibles.
  _masquerNumero(numero) {
    return "•••• •••• •••• " + String(numero).slice(-4);
  }
}

module.exports = CoreManager;
