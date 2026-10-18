// =============================================================================
// main.js — POINT D'ENTRÉE : assemblage (composition root) + histoire utilisateur
// =============================================================================
// Ce fichier CONSTRUIT les données et les services (l'assemblage), INJECTE tout
// dans DABOrchestrator, puis joue le scénario utilisateur.
// À l'exécution il ne parle PLUS qu'à UNE SEULE méthode : dab.executer(operation).
//
//   DABOrchestrator n'expose qu'une méthode (cf. son en-tête) qui ENCHAÎNE la
//   chronologie du distributeur : authentification → préparation → exécution par
//   la bonne classe métier → reçu → restitution de la carte.
//   Chaque GESTE est UNE CLASSE d'opération (operations.js) : les choix (quelle
//   classe métier, quels comptes) sont portés par le TYPE, pas par un if.
//
//   Pourquoi reste-t-il quelques lectures « directes » de données ?
//   - créer les objets (classes DONNÉE) : c'est l'assemblage, pas une opération ;
//   - lire un REGISTRE / CARNET (RegistreDepot, RegistreRetrait, CarnetOperation)
//     pour la VÉRIFICATION d'affichage : de la NAVIGATION sur la donnée, pas une
//     action de distributeur — elles restent donc hors `executer`.
// =============================================================================

// ---------- 1. IMPORT DES CLASSES ----------
const Compte = require("./Compte.js");
const Authenticateur = require("./Authenticateur.js");
const DABOrchestrator = require("./DABOrchestrator.js");
const Client = require("./Client.js");
const ClientProfile = require("./ClientProfile.js");
const CarteBancaire = require("./CarteBancaire.js");
const Facture = require("./Facture.js");
const {
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
} = require("./operations.js");

// services simples
const VirementService = require("./VirementService.js");
const DepotService = require("./DepotService.js");
const RetraitService = require("./RetraitService.js");
const PaiementFactureService = require("./PaiementFactureService.js");
const ConvertisseurDevises = require("./ConvertisseurDevises.js");
const EvaluateurProfil = require("./EvaluateurProfil.js");
const CalculateurDecouvert = require("./CalculateurDecouvert.js");
const CalculateurDecouvertGlobal = require("./CalculateurDecouvertGlobal.js");
// règles complexes (composites) — injectées dans l'orchestrateur
const RegistreDepot = require("./RegistreDepot.js");
const DepotPlafonneService = require("./DepotPlafonneService.js");
const RegistreRetrait = require("./RegistreRetrait.js");
const CalculFraisService = require("./CalculFraisService.js");
const RetraitPlafonneService = require("./RetraitPlafonneService.js");
const CarnetOperation = require("./CarnetOperation.js");
const PolitiqueFrais = require("./PolitiqueFrais.js");
const PolitiquePlafond = require("./PolitiquePlafond.js");
const VirementInternationalService = require("./VirementInternationalService.js");
const VirementInterClientService = require("./VirementInterClientService.js");

// Petit helper d'affichage du fil de l'eau.
const titre = (t) => console.log(`\n### ${t} ###`);
// Extrait le solde d'un label depuis le « reçu » retourné par dab.executer.
const soldeDe = (recept, label) => recept.comptes.find((c) => c.label === label).solde;

// -----------------------------------------------------------------------------
// 2. DONNÉES : les comptes du client (classes DONNÉE)
// -----------------------------------------------------------------------------
const compteCourant1 = new Compte('courant', 'courant', 1000); // 1000 € au départ
const compteCourant2 = new Compte('conjoint', 'courant', 400);  // 400 € au départ
const compteEpargne = new Compte('PEL', 'epargne', 500);        // 500 € au départ
const compteEDF = new Compte('EDF', 'courant');                 // compte du créancier

// -----------------------------------------------------------------------------
// 3. SERVICES MÉTIER + INJECTION des dépendances (l'assemblage)
// -----------------------------------------------------------------------------
const authenticateur = new Authenticateur(); // le PIN vit dans la carte (plus ici)
const virementService = new VirementService();                             // noyau des mouvements
const depotService = new DepotService();
const retraitService = new RetraitService();
const paiementFactureService = new PaiementFactureService(virementService); // COMPOSE VirementService
const convertisseurDevises = new ConvertisseurDevises("EUR", { USD: 1.09, GBP: 0.85 });
const evaluateurProfil = new EvaluateurProfil();                           // acte 1 : interprète le profil
const calculateurDecouvert = new CalculateurDecouvert();                   // acte 2 : décide le montant
const calculateurDecouvertGlobal = new CalculateurDecouvertGlobal();       // découvert agrégé multi-comptes

// Règles complexes : registres/carnet = DONNÉE, services = MÉTIER.
const registreDepot = new RegistreDepot();
const depotPlafonneService = new DepotPlafonneService(registreDepot, 500); // 500 € / jour / compte

const registreRetrait = new RegistreRetrait();
const calculFraisService = new CalculFraisService();                        // 0 € si ≤ 100 € sinon 0,5 %
const retraitPlafonneService = new RetraitPlafonneService({
  retraitService,
  calculFraisService,
  registreRetrait,
  plafondJournalier: 300, // 300 € / jour / compte
  plafondOperations: 5,   // 5 opérations / jour / compte
});

const politiqueFrais = new PolitiqueFrais();            // 0,5 % (min 1 €)
const politiquePlafond = new PolitiquePlafond(5000);   // max 5000 € / virement
const carnetOperation = new CarnetOperation();          // mémoire partagée (DONNÉE)
const virementInternationalService = new VirementInternationalService({
  convertisseur: convertisseurDevises,
  politiqueFrais,
  politiquePlafond,
  carnetOperation,
});
const virementInterClientService = new VirementInterClientService({
  politiqueFrais,
  politiquePlafond,
  carnetOperation,
});

// -----------------------------------------------------------------------------
// 4. ORCHESTRATEUR : on assemble TOUT dans un seul Parameter Object.
//    L'orchestrateur n'expose QU'UNE méthode : executer(operation).
// -----------------------------------------------------------------------------
const catalogueClients = {}; // annuaire id → Client (le « porte-client » du DAB)
// L'orchestrateur ne reçoit QUE ce qui relève de l'ORCHESTRATION (auth +
// annuaire). Les services métier ne lui sont PAS donnés : chaque opération les
// reçoit DANS SON CONSTRUCTEUR au moment de « new XxxOperation(...) ».
const dab = new DABOrchestrator({
  authenticateur,
  catalogueClients,
});

// -----------------------------------------------------------------------------
// 5. LES 3 PROFILS CLIENTS (classes DONNÉE — données à faire circuler)
// -----------------------------------------------------------------------------
const profilFiable = new ClientProfile({
  typeCompte: "courant",
  revenuMensuel: 2000,
  scoreFiabilite: 90,
  ancienneteMois: 36, // 3 ans de loyauté
  nbIncidents: 0,
});

const profilRisque = new ClientProfile({
  typeCompte: "courant",
  revenuMensuel: 2000,
  scoreFiabilite: 40,
  ancienneteMois: 3,   // compte récent
  nbIncidents: 3,      // 3 incidents
});

const profilEpargne = new ClientProfile({
  typeCompte: "epargne",
  revenuMensuel: 3000,
  scoreFiabilite: 80,
  ancienneteMois: 12,
  nbIncidents: 0,
});

// =============================================================================
// 6. SCÉNARIO UTILISATEUR — chaque geste du DAB = une opération → executer
// =============================================================================
// Le Client charge lui-même ses infos via sa source (InfoClientSource, id=1).
const client = new Client(1, profilFiable, { courant: compteCourant1, conjoint: compteCourant2, PEL: compteEpargne });
console.log("Client chargé depuis clients.json ->", client.getInfoClient().getNom(), "|", client.getInfoClient().getEmail(), "|", client.getInfoClient().getAdresse());
catalogueClients[1] = client; // l'annuaire du DAB connaît le client 1

// La CARTE de Martin (classe DONNÉE) : numéro, SON code, son propriétaire.
const carteMartin = new CarteBancaire("4970 1234 5678 9012", "1234", 1);

// ---- RÉALITÉ DAB : insérer sa carte, taper son code, accéder à ses comptes ----
titre("AUTHENTIFICATION (la carte porte SON code)");
console.log("Carte insérée ->", carteMartin.getNumero());
console.log("Code '1234'    ->", dab.executer(new AuthentificationOperation({ carte: carteMartin, code: "1234" }, authenticateur)).codeValide);
console.log("Code '0000'    ->", dab.executer(new AuthentificationOperation({ carte: carteMartin, code: "0000" }, authenticateur)).codeValide); // échec (compteur +1)

titre("OUVERTURE DE SESSION (carte → propriétaire → comptes)");
const session = dab.executer(new SessionOperation({ carte: carteMartin, code: "1234" }));
console.log("Session ouverte pour ->", session.client);
console.log("Comptes accessibles par label :");
for (const compte of session.comptes) {
  console.log(`   - ${compte.label} (${compte.type}) : ${compte.solde} €`);
}
try {
  dab.executer(new SessionOperation({ carte: carteMartin, code: "9999" })); // mauvais code → refus
} catch (err) {
  console.log("REFUS (mauvais code) ->", err.message);
}

titre("CONSULTATION DES SOLDES");
console.log("Solde courant ->", dab.executer(new ConsultationOperation({ carte: carteMartin, code: "1234", labelCompte: "courant" })).solde, "€");
console.log("Solde conjoint ->", dab.executer(new ConsultationOperation({ carte: carteMartin, code: "1234", labelCompte: "conjoint" })).solde, "€");
console.log("Solde PEL ->", dab.executer(new ConsultationOperation({ carte: carteMartin, code: "1234", labelCompte: "PEL" })).solde, "€");

titre("LES 3 PROFILS CLIENTS (règle de découvert)");
for (const [nom, profil] of [
  ["FIABLE ", profilFiable],
  ["RISQUE ", profilRisque],
  ["EPARGNE", profilEpargne],
]) {
  const r = dab.executer(new DecouvertOperation({ profil }, evaluateurProfil, calculateurDecouvert)); // les 2 actes (évaluation + décision) par le type
  console.log(
    `${nom} | score=${profil.getScoreFiabilite()} anciennete=${profil.getAncienneteMois()}mois incidents=${profil.getNbIncidents()} ` +
      `-> facteur=${r.facteur.toFixed(2)} | découvert=${r.decouvert} €`
  );
}

titre("OPÉRATIONS BANCAIRES");
let reçu = dab.executer(new DepotOperation({ carte: carteMartin, code: "1234", labelCompte: "courant", montant: 100 }, depotService));
console.log("Après dépôt +100 courant       ->", soldeDe(reçu, "courant"), "€ | carte", reçu.restitutionCarte ? "rendue" : "?");

reçu = dab.executer(new RetraitOperation({ carte: carteMartin, code: "1234", labelCompte: "conjoint", montant: 50 }, retraitService));
console.log("Après retrait -50 conjoint     ->", soldeDe(reçu, "conjoint"), "€");

reçu = dab.executer(new VirementOperation({ carte: carteMartin, code: "1234", labelSource: "courant", labelCible: "PEL", montant: 200 }, virementService));
console.log("Après virement 200 courant→PEL ->", "courant=", soldeDe(reçu, "courant"), "€", "epargne=", soldeDe(reçu, "PEL"), "€");

const factureEDF = new Facture("EDF-2026-001", 80, compteEDF);
reçu = dab.executer(new PaiementFactureOperation({ carte: carteMartin, code: "1234", labelCompte: "conjoint", facture: factureEDF }, paiementFactureService));
console.log("Après paiement facture 80 (conjoint) -> conjoint=", soldeDe(reçu, "conjoint"), "€");

titre("CONVERSION & RETRAIT EN DEVISES");
const conversion = dab.executer(new ConversionOperation({ montant: 100, deviseCible: "USD" }, convertisseurDevises));
console.log("Conversion 100 EUR -> USD =", conversion.converti, "$");
reçu = dab.executer(new RetraitDeviseOperation({ carte: carteMartin, code: "1234", labelCompte: "courant", montant: 100, deviseCible: "USD" }, convertisseurDevises, retraitService));
console.log("Retrait 100 EUR en USD -> débite", reçu.debite, "$ | courant reste", soldeDe(reçu, "courant"), "€");

// =============================================================================
// 7. RÈGLES MÉTIER COMPLEXES — confrontation des nouveaux modules.
//    Les OPÉRATIONS passent par dab.executer. Les lectures de REGISTRES / CARNET
//    ci-dessous ne sont que de la VÉRIFICATION d'affichage (navigation sur des
//    objets DONNÉE détenus par ce fichier d'assemblage).
// =============================================================================
console.log("\n=================================================================");
console.log(" RÈGLES MÉTIER COMPLEXES — confrontation des nouveaux modules");
console.log("=================================================================");

// -----------------------------------------------------------------------------
// 7.1 CLIENT (classe DONNÉE composite) : info + profil + tous les comptes.
// -----------------------------------------------------------------------------
console.log("\n--- 7.1 CLIENT AGRÉGÉ ---");
const etat = dab.executer(new EtatClientOperation({ client }));
console.log("Client  ->", etat.nom, "|", etat.email);
console.log("Profil  -> score fiabilité =", etat.score);
console.log("Comptes ->", etat.comptes.map((c) => `${c.label}=${c.solde}€`).join(", "));
console.log("Solde TOTAL agrégé ->", etat.soldeTotal, "€");

// -----------------------------------------------------------------------------
// 7.2 DÉCOUVERT GLOBAL : garantie = soldeTotal × coefficient (Client ENTIER).
// -----------------------------------------------------------------------------
console.log("\n--- 7.2 DÉCOUVERT GLOBAL (agrégation multi-comptes) ---");
for (const demande of [400, 5000]) {
  const decision = dab.executer(new DecouvertGlobalOperation({ client, demande }, evaluateurProfil, calculateurDecouvertGlobal));
  console.log(
    `demande=${demande}€ | facteur=${decision.facteur.toFixed(2)} coeff=${decision.coefficient} ` +
      `garantie=${decision.garantie}€ -> ${decision.accorde ? "ACCORDÉ" : "REFUSÉ"}`
  );
}

// -----------------------------------------------------------------------------
// 7.3 DÉPÔT PLAFONNÉ JOURNALIER : l'état vit dans RegistreDepot (classe DONNÉE).
// -----------------------------------------------------------------------------
console.log("\n--- 7.3 DÉPÔT PLAFONNÉ (500 € / jour / compte) ---");
const essaisDepot = [
  [200, "courant", "courant  +200"],
  [300, "PEL", "epargne  +300"],
  [200, "courant", "courant  +200 de plus"],
];
for (const [montant, label, libelle] of essaisDepot) {
  const r = dab.executer(new DepotPlafonneOperation({ carte: carteMartin, code: "1234", labelCompte: label, montant }, depotPlafonneService));
  console.log(`OK   ${libelle} -> courant=${soldeDe(r, "courant")}€ epargne=${soldeDe(r, "PEL")}€`);
}
// Vérification de la mémoire du jour (lecture d'un objet DONNÉE détenu ici).
console.log(
  "Mémoire du jour ->",
  registreDepot.totalDuJour(client.getCompte("courant")),
  "€ sur courant |",
  registreDepot.totalDuJour(client.getCompte("PEL")),
  "€ sur epargne"
);
try {
  dab.executer(new DepotPlafonneOperation({ carte: carteMartin, code: "1234", labelCompte: "courant", montant: 150 }, depotPlafonneService)); // 400+150=550 > 500 → refus
} catch (err) {
  console.log("REFUS", err.message);
}

// -----------------------------------------------------------------------------
// 7.4 VIREMENT INTERNATIONAL : pipeline plafond → conversion → frais → virement.
// -----------------------------------------------------------------------------
const compteRecepteurUSA = new Compte("usa", 'courant', 0); // compte extérieur en USD
console.log("\n--- 7.4 VIREMENT INTERNATIONAL (100 € courant → compte USA en USD) ---");
const vir = dab.executer(new VirementInternationalOperation({
  carte: carteMartin, code: "1234", labelSource: "courant",
  montant: 100, deviseCible: "USD", compteCible: compteRecepteurUSA,
}, virementInternationalService));
console.log("Solde courant ->", soldeDe(vir, "courant"), "€ (-100 € - 1 € de frais)");
console.log("Solde USA     ->", vir.compteCible.solde, "$ (100 € convertis)");
// Vérification du carnet (élément DONNÉE partagé).
console.log("Opérations journalisées ->", carnetOperation.nbOperations());
for (const op of carnetOperation.lister()) {
  console.log(
    `  ${op.type} | ${op.montant}€ -> ${op.deviseCible} (${op.montantConverti}) | ` +
      `frais=${op.frais}€ | total débité=${op.totalDebite}€ | ${op.source}→${op.cible}`
  );
}
try {
  dab.executer(new VirementInternationalOperation({
    carte: carteMartin, code: "1234", labelSource: "courant",
    montant: 6000, deviseCible: "USD", compteCible: compteRecepteurUSA, // 6000 > plafond → refus
  }, virementInternationalService));
} catch (err) {
  console.log("REFUS", err.message);
}

// -----------------------------------------------------------------------------
// 7.5 RETRAIT DAB PLAFONNÉ + FRAIS : plafond 300 €/j, 5 op/j, frais 0,5 % > 100 €
// -----------------------------------------------------------------------------
console.log("\n--- 7.5 RETRAIT DAB PLAFONNÉ (300 € / j / compte) + FRAIS (0,5 % si > 100 €) ---");
const essaisRetrait = [
  [50, "courant", "courant  -50   (≤ 100 € → gratuit)"],
  [100, "courant", "courant  -100  (exactement 100 € → gratuit)"],
  [150, "courant", "courant  -150  (0,5 % → frais 0,75 €)"],
];
for (const [montant, label, libelle] of essaisRetrait) {
  const r = dab.executer(new RetraitPlafonneOperation({ carte: carteMartin, code: "1234", labelCompte: label, montant }, retraitPlafonneService));
  console.log(
    `OK   ${libelle} -> retrait=${r.resultat.montant}€ frais=${r.resultat.frais}€ ` +
      `total débité=${r.resultat.totalDebite}€ | solde=${r.comptes.find((c) => c.label === label).solde}€`
  );
}
// Vérification de la mémoire du jour (lecture d'un objet DONNÉE détenu ici).
console.log(
  "Mémoire du jour (courant) ->",
  registreRetrait.totalDuJour(client.getCompte("courant")),
  "€ en",
  registreRetrait.nbOperationsDuJour(client.getCompte("courant")),
  "opérations"
);
try {
  dab.executer(new RetraitPlafonneOperation({ carte: carteMartin, code: "1234", labelCompte: "courant", montant: 50 }, retraitPlafonneService)); // 350 > 300 → refus
} catch (err) {
  console.log("REFUS", err.message);
}
// 2e garde-fou : max 5 opérations / jour / compte (démontré sur 'conjoint').
for (let i = 0; i < 5; i++) {
  dab.executer(new RetraitPlafonneOperation({ carte: carteMartin, code: "1234", labelCompte: "conjoint", montant: 1 }, retraitPlafonneService));
}
console.log(
  "5 opérations de 1 € sur conjoint ->",
  registreRetrait.nbOperationsDuJour(client.getCompte("conjoint")),
  "opérations enregistrées"
);
try {
  dab.executer(new RetraitPlafonneOperation({ carte: carteMartin, code: "1234", labelCompte: "conjoint", montant: 1 }, retraitPlafonneService)); // 6e op → refus
} catch (err) {
  console.log("REFUS", err.message);
}

// -----------------------------------------------------------------------------
// 7.6 VIREMENT INTER-CLIENTS : de client 1 (courant) vers client 2 (transit)
// -----------------------------------------------------------------------------
const client2 = new Client(3, profilFiable, { transit: new Compte('transit', 'courant', 910) });
catalogueClients[3] = client2; // l'annuaire du DAB connaît aussi le client 3
const carteDupond = new CarteBancaire("4970 9999 8888 7777", "9999", 3); // sa carte, son code
const sessionDupond = dab.executer(new SessionOperation({ carte: carteDupond, code: "9999" }));
console.log(
  "Session client 3 ->", sessionDupond.client,
  "| comptes :", sessionDupond.comptes.map((c) => c.label).join(", ")
);

console.log("\n--- 7.6 VIREMENT INTER-CLIENTS (500 € : courant[client1] → transit[client2]) ---");
const virInter = dab.executer(new VirementInterClientOperation({
  carte: carteMartin, code: "1234",
  labelSource: "courant", clientCible: client2, labelCible: "transit",
  montant: 500, devise: "EUR",
}, virementInterClientService));
console.log(
  `OK   virement=${virInter.resultat.montant}€ frais=${virInter.resultat.frais}€ total débité=${virInter.resultat.totalDebite}€ ` +
    `| courant=${soldeDe(virInter, "courant")}€ → transit=${virInter.compteCible.solde}€`
);
console.log("Opérations journalisées ->", carnetOperation.nbOperations());
const derniereOp = carnetOperation.lister().slice(-1)[0];
console.log(
  `  ${derniereOp.type} | ${derniereOp.montant}€ (${derniereOp.devise}) | frais=${derniereOp.frais}€ | ` +
    `total débité=${derniereOp.totalDebite}€ | ${derniereOp.source}→${derniereOp.cible}`
);
try {
  dab.executer(new VirementInterClientOperation({
    carte: carteMartin, code: "1234",
    labelSource: "courant", clientCible: client, labelCible: "courant", // le MÊME compte → refus
    montant: 100, devise: "EUR",
  }, virementInterClientService));
} catch (err) {
  console.log("REFUS", err.message);
}




