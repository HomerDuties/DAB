// =============================================================================
// test-core-manager.js — LE CORE SANS FRONT-END (preuve de principe)
// =============================================================================
// Cette « preuve sans écran » pilote LE VRAI core (web/core-manager.js) avec
// LE VRAI domaine (DAB/), exactement comme la vue (et plus tard le serveur) le
// fera : agir(action, payload) → lire etatCourant().
//
// C'est la validation de la couche CORE :
//   1. la navigation d'écran (accueil → code → menu → opération → reçu → rendu) ;
//   2. les 5 opérations simples branchées sur le métier (orchestrateur + services
//      réels) — consulter / retirer / déposer / virer / payer une facture ;
//   3. les refus (code invalide, fonds insuffisants) rangés dans `etat.erreur`.
// Rien ne dessine et rien ne tourne : `node web/test-core-manager.js`.
// =============================================================================

// ---------- le domaine (mêmes classes que main.js : données + services) ----------
const Compte = require("../../Metier/Compte.js");
const Authenticateur = require("../../Metier/Authenticateur.js");
const DABOrchestrator = require("../../Metier/DABOrchestrator.js");
const Client = require("../../Metier/Client.js");
const ClientProfile = require("../../Metier/ClientProfile.js");
const CarteBancaire = require("../../Metier/CarteBancaire.js");
const Facture = require("../../Metier/Facture.js");
const VirementService = require("../../Metier/VirementService.js");
const DepotService = require("../../Metier/DepotService.js");
const RetraitService = require("../../Metier/RetraitService.js");
const PaiementFactureService = require("../../Metier/PaiementFactureService.js");

const CoreManager = require("./core-manager.js");

// ---------- les données (mêmes classes DONNÉE que le domaine) ----------
const profil = new ClientProfile({
  typeCompte: "courant", revenuMensuel: 3000, scoreFiabilite: 90, ancienneteMois: 24, nbIncidents: 0,
});
const courant = new Compte("courant", "courant", 1000);
const epargne = new Compte("epargne", "epargne", 500);
const client = new Client(1, profil, { courant, epargne });
const annuaire = { 1: client };                                 // catalogueClients (id → Client)
const carteMartin = new CarteBancaire("4970 1234 5678 9012", "1234", 1);

// Le créancier de la facture : un compte « externe » au client (comme main.js).
const compteEDF = new Compte("edf", "courant", 0);
const factureEDF = new Facture("EDF-2026-001", 120, compteEDF);

// ---------- l'assemblage (même composition que main.js pour les 5 services) ----------
const virementService = new VirementService();
const depotService = new DepotService();
const retraitService = new RetraitService();
const paiementFactureService = new PaiementFactureService(virementService);
const orchestreur = new DABOrchestrator({
  authenticateur: new Authenticateur(3),  // 3 essais avant blocage (cf. main.js)
  catalogueClients: annuaire,
});

// On espionne l'orchestrateur pour prouver QUE le core lui délègue bien :
// chaque opération (SessionOperation, RetraitOperation…) y est enregistrée.
const operationsVues = [];
const executerOriginal = orchestreur.executer.bind(orchestreur);
orchestreur.executer = (op) => {
  operationsVues.push(op.constructor.name);
  return executerOriginal(op);
};

const machine = new CoreManager({
  orchestreur,
  services: {
    retrait: retraitService,
    depot: depotService,
    virement: virementService,
    paiementFacture: paiementFactureService,
  },
  cartes: [{ id: "martin", numero: carteMartin.getNumero(), proprietaire: "Martin", instance: carteMartin }],
  factures: [factureEDF],
});

// ---------- le mini-cadre d'assertions (zéro dépendance) ----------
let totalAssertions = 0;
let assertReussies = 0;
function verifier(condition, libelle) {
  totalAssertions += 1;
  const ok = Boolean(condition);
  if (ok) assertReussies += 1;
  console.log(`   ${ok ? "✅" : "❌"} ${libelle}${ok ? "" : "  ← ÉCHEC"}`);
  return ok;
}

// Déclenche une action et AFFICHE le nouvel état → le fil de l'eau se lit.
function appuyer(m, action, payload = {}) {
  const etat = m.agir(action, payload);
  const details = Object.keys(payload).length ? ` ${JSON.stringify(payload)}` : "";
  console.log(`   ⇨ ${action}${details} → phase « ${etat.screen} »${etat.erreur ? " ⚠️ " + etat.erreur : ""}`);
  return etat;
}

// Suit le chemin « heureux » : carte → code → menu (utilisé partout).
function seConnecter(m) {
  m.agir("insererCarte", { carteId: "martin" });
  for (const c of "1234") m.agir("chiffre", { chiffre: c });
  m.agir("valider");
}

// Vide la saisie puis tape un montant chiffre par chiffre (clavier du DAB).
function saisirMontant(m, montant) {
  while (m.etatCourant().saisie.length > 0) m.agir("effacer");
  for (const c of String(montant)) m.agir("chiffre", { chiffre: c });
}

// Solde affiché d'un compte dans l'état courant (pour les assertions).
function soldeDe(m, label) {
  return m.etatCourant().comptes.find((c) => c.label === label).solde;
}

console.log("=== SCÉNARIO 1 — Consultation : accueil → carte → code → menu → reçu → rendu ===");

// Retrouve une ligne du reçu par son libellé (sa valeur affichée, ou undefined).
function recuLigne(etat, label) {
  return etat.recu?.lignes.find((l) => l.label === label)?.valeur;
}

let etat = machine.etatCourant();
verifier(etat.screen === "accueil", "L'état initial est l'écran d'accueil.");
verifier(etat.options[0]?.action === "insererCarte", "L'accueil propose d'insérer la carte.");

etat = appuyer(machine, "insererCarte", { carteId: "martin" });
verifier(etat.screen === "saisie_code", "Après insertion → saisie du code.");
verifier(etat.carte?.numero.endsWith("9012") && etat.carte.proprietaire === "Martin",
  "La carte affichée est masquée (…9012, Martin).");

etat = appuyer(machine, "chiffre", { chiffre: "1" });
etat = appuyer(machine, "chiffre", { chiffre: "2" });
etat = appuyer(machine, "chiffre", { chiffre: "3" });
etat = appuyer(machine, "chiffre", { chiffre: "4" });
verifier(etat.saisie === "1234", "Le code saisi apparaît (4 chiffres).");

etat = appuyer(machine, "valider");
verifier(etat.screen === "menu", "Code valide → menu principal.");
verifier(etat.client === "Martin" && soldeDe(machine, "courant") === 1000 && soldeDe(machine, "epargne") === 500,
  "Le menu connaît le client et les soldes (données venues du domaine).");
verifier(etat.options.length === 6, "Le menu propose les 5 opérations + rendre la carte.");

// Un geste illégal en phase menu doit être REFUSÉ (rangé dans etat.erreur).
etat = appuyer(machine, "chiffre", { chiffre: "5" });
verifier(etat.screen === "menu" && /impossible/.test(etat.erreur), "Action illégale en phase menu → erreur explicite.");

etat = appuyer(machine, "choisirOperation", { operation: "consulter" });
verifier(etat.screen === "resultat", "Consultation → écran reçu.");
verifier(/ConsultationOperation/.test(etat.recu.entete) && etat.recu.lignes.some((l) => l.label.includes("courant")),
  "Le reçu est celui de la consultation et liste le solde du compte.");
verifier(operationsVues.includes("SessionOperation") && operationsVues.includes("ConsultationOperation"),
  "Le core a délégué au métier (SessionOperation puis ConsultationOperation).");

etat = appuyer(machine, "continuer");
verifier(etat.screen === "menu", "« Continuer » → retour au menu.");
etat = appuyer(machine, "rendreCarte");
verifier(etat.screen === "accueil" && /Carte rendue/.test(etat.message), "« Rendre la carte » → retour accueil.");

console.log("\n=== SCÉNARIO 2 — Retirer : choix du compte, fonds insuffisants, succès ===");
seConnecter(machine);

etat = appuyer(machine, "choisirOperation", { operation: "retirer" });
verifier(etat.screen === "choix_compte", "Retirer → choix du compte.");
verifier(etat.options.some((o) => o.label.includes("courant")), "L'écran propose le compte « courant ».");

etat = appuyer(machine, "choisirCompte", { label: "courant" });
verifier(etat.screen === "saisie_montant", "Compte choisi → saisie du montant.");

saisirMontant(machine, 9999);
etat = appuyer(machine, "valider");
verifier(etat.screen === "saisie_montant" && etat.erreur === "Fonds insuffisants.",
  "Retirer 9 999 € (solde 1 000 €) → refus métier « Fonds insuffisants. ».");

saisirMontant(machine, 50);
etat = appuyer(machine, "valider");
verifier(etat.screen === "resultat", "Retrait accepté → écran reçu.");
verifier(recuLigne(etat, "Montant") === "50 €", "Le reçu mentionne le montant retiré (50 €).");
verifier(soldeDe(machine, "courant") === 950, "Le solde « courant » est passé à 950 € (1 000 − 50).");

console.log("\n=== SCÉNARIO 3 — Déposer : dépôt sur « épargne » ===");
etat = appuyer(machine, "rendreCarte");
seConnecter(machine);
etat = appuyer(machine, "choisirOperation", { operation: "deposer" });
etat = appuyer(machine, "choisirCompte", { label: "epargne" });
saisirMontant(machine, 150);
etat = appuyer(machine, "valider");
verifier(etat.screen === "resultat" && recuLigne(etat, "Montant") === "150 €", "Dépôt de 150 € exécuté et reçu affiché.");
verifier(soldeDe(machine, "epargne") === 650, "Le solde « épargne » est passé à 650 € (500 + 150).");

console.log("\n=== SCÉNARIO 4 — Virer : source → cible, et refus de la source comme cible ===");
etat = appuyer(machine, "rendreCarte");
seConnecter(machine);
etat = appuyer(machine, "choisirOperation", { operation: "virer" });
etat = appuyer(machine, "choisirCompte", { label: "courant" });
verifier(etat.screen === "choix_compte_cible", "Virer → après la source, l'écran demande la cible.");
verifier(!etat.options.some((o) => o.payload?.label === "courant"),
  "La source n'est pas proposée comme cible (refus métier évité à l'écran).");
etat = appuyer(machine, "choisirCompteCible", { label: "courant" });
verifier(/AUTRE/.test(etat.erreur), "Tenter la source comme cible → erreur « choisissez un autre compte ».");
etat = appuyer(machine, "choisirCompteCible", { label: "epargne" });
verifier(etat.screen === "saisie_montant", "Cible choisie → saisie du montant.");
saisirMontant(machine, 200);
etat = appuyer(machine, "valider");
verifier(etat.screen === "resultat" && recuLigne(etat, "Montant") === "200 €", "Virement de 200 € exécuté et reçu affiché.");
verifier(soldeDe(machine, "courant") === 750 && soldeDe(machine, "epargne") === 850,
  "Soldes après virement : courant 750 € (950−200), épargne 850 € (650+200).");

console.log("\n=== SCÉNARIO 5 — Payer une facture : EDF 120 € depuis « courant » ===");
etat = appuyer(machine, "rendreCarte");
seConnecter(machine);
etat = appuyer(machine, "choisirOperation", { operation: "payer" });
etat = appuyer(machine, "choisirCompte", { label: "courant" });
verifier(etat.screen === "choix_facture", "Payer → choix de la facture.");
verifier(etat.options.some((o) => o.label.includes("EDF-2026-001")), "La facture EDF est proposée.");
etat = appuyer(machine, "choisirFacture", { reference: "EDF-2026-001" });
verifier(etat.screen === "resultat" && recuLigne(etat, "Référence") === "EDF-2026-001",
  "Facture payée → reçu avec la référence.");
verifier(soldeDe(machine, "courant") === 630, "Solde « courant » : 750 − 120 = 630 €.");
verifier(compteEDF.getSolde() === 120, "Le créancier (EDF) est crédité de 120 €.");

console.log("\n=== SCÉNARIO 6 — Code erroné : erreur à l'écran, puis annuler rend la carte ===");
etat = appuyer(machine, "rendreCarte");
etat = appuyer(machine, "insererCarte", { carteId: "martin" });
for (const c of "9999") etat = appuyer(machine, "chiffre", { chiffre: c });
etat = appuyer(machine, "valider");
verifier(etat.screen === "saisie_code" && /code invalide/i.test(etat.erreur),
  "Code erroné → erreur d'authentification affichée (pas de menu).");
verifier(etat.saisie === "", "Le DAB efface la saisie après un code refusé.");
etat = appuyer(machine, "annuler");
verifier(etat.screen === "accueil" && /Carte retirée/.test(etat.message),
  "« Annuler » pendant la saisie → la carte est retirée, retour accueil.");

console.log("\n=== SCÉNARIO 7 — Garde-fous : assemblage incomplet, actions interdites ===");
let refusConstr = false;
try {
  new CoreManager({
    orchestreur,
    services: { retrait: retraitService, depot: depotService, virement: virementService }, // paiementFacture manquant
    cartes: [{ id: "x", numero: "1", proprietaire: "p", instance: carteMartin }],
    factures: [],
  });
} catch (err) {
  refusConstr = /service/.test(err.message);
}
verifier(refusConstr, "CoreManager refuse l'assemblage s'il manque un service (paiementFacture).");

etat = appuyer(machine, "inconnue");
verifier(/non implémentée/.test(etat.erreur), "Action inconnue → erreur explicite du core.");
etat = appuyer(machine, "choisirOperation", { operation: "consulter" });
verifier(/impossible en phase « accueil »/.test(etat.erreur), "À l'accueil, choisir une opération est refusé (carte absente).");

console.log("\n=== BILAN ===");
console.log(`Opérations déléguées au métier : ${[...new Set(operationsVues)].join(", ")}`);
console.log(`Assertions : ${assertReussies}/${totalAssertions} réussies.`);
if (assertReussies === totalAssertions) {
  console.log("✅ TOUS LES SCÉNARIOS ONT RÉUSSI — le core est prêt pour le serveur et la vue.");
  process.exitCode = 0;
} else {
  console.log("❌ DES ASSERTIONS ONT ÉCHOUÉ — corriger avant de brancher le serveur.");
  process.exitCode = 1;
}
