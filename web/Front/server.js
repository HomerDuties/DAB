// =============================================================================
// server.js — LE PONT-HTTP entre le FRONT (web/public) et le CORE (contrat agir / état)
// =============================================================================
// Le core (web/core-manager.js) est testable sans navigateur ; ce serveur
// la rend accessible à une VUE (web/public) via le contrat décrit dans
// web/README.md : la vue envoie { action, payload } et reçoit l'état JSON à
// réafficher. Aucune règle métier ici — uniquement du transport.
//
// Le serveur construit SON domaine (mêmes classes, mêmes soldes que
// ../../Metier/main.js et que le test) puis expose le core ; c'est L'UTILISATEUR
// qui pilote le parcours en envoyant les actions (aucun scénario pré-généré).
//
// ROUTES :
//   GET  /api/etat                 → état courant (JSON)
//   POST /api/agir                 → corps { action, payload } → nouvel état
//   POST /api/reset                → réinitialise le DAB (nouveau monde)
//   GET  /...                      → fichiers statiques de web/public/
//
// LANCEMENT :
//   node web/server.js             → http://localhost:3000
//   PORT=8080 node web/server.js   → port via variable d'environnement
//   node web/server.js 3100        → port passé en argument de ligne de commande
// =============================================================================

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

// ---------- le domaine du DAB (mêmes classes et soldes que main.js) ----------
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
const CoreManager = require("../Back/core-manager.js");

// Le core vit dans ce module (un CoreManager par processus), réinitialisé via
// /api/reset. Une évolution possible sera un registre de CoreManager par session
// quand l'UI finale arrivera.
let core = construireCore();

// ---------------------------------------------------------------
// construireCore() → un core neuf (soldes et carte repartent de zéro)
// ---------------------------------------------------------------
function construireCore() {
  // --- données (classes DONNÉE du domaine, valeurs identiques à main.js) ---
  const profil = new ClientProfile({
    typeCompte: "courant", revenuMensuel: 3000, scoreFiabilite: 90, ancienneteMois: 24, nbIncidents: 0,
  });
  const courant = new Compte("courant", "courant", 1000);
  const epargne = new Compte("epargne", "epargne", 500);
  const client = new Client(1, profil, { courant, epargne });
  const annuaireClients = { 1: client };                       // catalogueClients (id → Client)
  const carteMartin = new CarteBancaire("4970 1234 5678 9012", "1234", 1);

  // Le créancier de la facture : un compte « externe » au client (comme main.js).
  const compteEDF = new Compte("edf", "courant", 0);
  const factureEDF = new Facture("EDF-2026-001", 120, compteEDF);

  // --- services (même composition que main.js pour les 5 opérations simples) ---
  const virementService = new VirementService();
  const depotService = new DepotService();
  const retraitService = new RetraitService();
  const paiementFactureService = new PaiementFactureService(virementService);

  // --- orchestreur : authentification + annuaire (cf. DABOrchestrator) ---
  const orchestreur = new DABOrchestrator({
    authenticateur: new Authenticateur(3),  // 3 essais avant blocage (cf. main.js)
    catalogueClients: annuaireClients,
  });

  // --- le core (le « cerveau » de l'appli — le bien que la vue pilote) ---
  return new CoreManager({
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
}

const PUBLIC_DIR = path.join(__dirname, "public");

// ---------------------------------------------------------------
// creerServeur() → serveur HTTP prêt à écouter
// (exporté pour faciliter une future intégration ; lancement réel en bas)
// ---------------------------------------------------------------
function creerServeur({ coreInitial } = {}) {
  if (coreInitial) core = coreInitial;
  const serveur = http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      envoyerJson(res, 500, { erreur: "Erreur interne du serveur : " + (err && err.message) });
    });
  });
  return serveur;
}

// Le cœur : une seule grande décision de ROUTAGE, puis des réponses JSON.
async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const chemin = url.pathname;

  // CORS : la vue (ou un serveur de dev séparé) peut consommer l'API.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if (chemin === "/api/etat" && req.method === "GET") {
    envoyerJson(res, 200, core.etatCourant());
    return;
  }

  if (chemin === "/api/agir" && req.method === "POST") {
    const corps = await lireCorpsJson(req, res);
    if (corps === null) return; // 400 déjà envoyé
    if (typeof corps.action !== "string" || !corps.action) {
      envoyerJson(res, 400, { erreur: "Champ « action » (chaîne) manquant dans le corps JSON." });
      return;
    }
    // Le core ne lève jamais d'erreur pour un geste utilisateur : confions-lui
    // tout ; l'éventuel refus est déjà rangé dans etat.erreur.
    debugger; // ③ (ALLER) — le serveur (le « pompiste ») a reçu le POST /api/agir.
    // ↑ Inspecte `corps.action` / `corps.payload` (ce que le navigateur a envoyé),
    //   puis entre (F11) : `core.agir(...)` délègue le geste au CERVEAU.
    envoyerJson(res, 200, core.agir(corps.action, corps.payload ?? {}));
    return;
  }

  if (chemin === "/api/reset" && req.method === "POST") {
    core = construireCore(); // cartes, factures et soldes recompilés
    envoyerJson(res, 200, core.etatCourant());
    return;
  }

  // --- fichiers statiques de la vue (web/public) ---
  const fichier = resoudreStatique(chemin);
  if (fichier) { servirStatique(res, fichier); return; }

  envoyerJson(res, 404, { erreur: `Introuvable : ${req.method} ${chemin}` });
}

// ---------- petits outils HTTP ----------

// Lit le corps de la requête et le décode en JSON ; en cas d'erreur (ou corps
// vide / invalide) renvoie un 400 et retourne null pour que l'appelant s'arrête.
function lireCorpsJson(req, res) {
  return new Promise((resolve) => {
    let brut = "";
    req.setEncoding("utf8");
    req.on("data", (morceau) => { brut += morceau; });
    req.on("end", () => {
      if (!brut.trim()) { envoyerJson(res, 400, { erreur: "Corps JSON vide." }); resolve(null); return; }
      debugger; // ③b (ALLER) — le corps BRUT envoyé par le navigateur arrive ici.
      // ↑ `brut` = le texte exact du corps HTTP ; la ligne suivante le décode
      //   en `{ action, payload }`.
      try { resolve(JSON.parse(brut)); }
      catch (err) { envoyerJson(res, 400, { erreur: "Corps JSON invalide : " + err.message }); resolve(null); }
    });
    req.on("error", () => { envoyerJson(res, 400, { erreur: "Lecture du corps impossible." }); resolve(null); });
  });
}

function envoyerJson(res, statut, objet) {
  debugger; // ⑦ (RETOUR) — le serveur sérialise l'état en JSON pour la réponse HTTP.
  // ↑ `objet` = l'état produit par le core ; il est stringifié et renvoyé au navigateur.
  const corps = JSON.stringify(objet, null, 2);
  res.writeHead(statut, { "Content-Type": "application/json; charset=utf-8" });
  res.end(corps);
}

// Résout un chemin d'URL vers un fichier de public/ — avec protection contre
// toute sortie du répertoire (traversal) : ".." est refusé après normalisation.
function resoudreStatique(cheminURL) {
  const relatif = cheminURL === "/" ? "index.html" : cheminURL.replace(/^\/+/, "");
  const cible = path.resolve(PUBLIC_DIR, relatif);
  const relative = path.relative(PUBLIC_DIR, cible);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null; // ".." interdit
  try { return fs.statSync(cible).isFile() ? cible : null; } catch { return null; }
}

// Envoie un fichier statique avec le bon Content-Type (déduit de l'extension).
function servirStatique(res, fichier) {
  const type = typesMime[path.extname(fichier).toLowerCase()] || "application/octet-stream";
  fs.readFile(fichier, (err, contenu) => {
    if (err) { envoyerJson(res, 500, { erreur: "Lecture du fichier impossible : " + fichier }); return; }
    res.writeHead(200, { "Content-Type": type });
    res.end(contenu);
  });
}

const typesMime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

// ---------- lancement réel (exécuté uniquement quand on lance le fichier) ----------
if (require.main === module) {
  const port = Number(process.env.PORT) || (process.argv[2] && Number(process.argv[2])) || 3000;
  const serveur = creerServeur();
  serveur.listen(port, () => {
    console.log("=== CoreManager — serveur prêt ===");
    console.log(`   Vue (bac à sable)  : http://localhost:${port}/`);
    console.log(`   État courant       : http://localhost:${port}/api/etat`);
    console.log(`   Envoyer une action : POST http://localhost:${port}/api/agir`);
    console.log(`                        { "action": "insererCarte", "payload": { "carteId": "martin" } }`);
    console.log(`   Réinitialiser      : POST http://localhost:${port}/api/reset`);
  });
}

module.exports = { creerServeur, construireCore };
