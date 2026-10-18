// =============================================================================
// DataClientProvider.js — FOURNISSEUR DE DONNÉES CLIENTS
// =============================================================================
// RÔLE — Une seule responsabilité : fournir des données Clients depuis un JSON.
// Ne connaît PAS les classes métier (Client, ClientProfile, etc.).
// Retourne des objets littéraux purs (POJO).
// =============================================================================

const fs = require("fs");
const path = require("path");

class DataClientProvider {
  constructor() {
    // Chargement des données une fois au démarrage (mémoire)
    this._clients = this._chargerJSON("clients.json");
  }

  // ---------------------------------------------------------------------------
  // Méthode privée : charger un fichier JSON
  // ---------------------------------------------------------------------------
  _chargerJSON(nomFichier) {
    const chemin = path.join(__dirname, "data", nomFichier);
    const contenu = fs.readFileSync(chemin, "utf-8");
    return JSON.parse(contenu);
  }

  // ---------------------------------------------------------------------------
  // getClientById(id) → { id, nom } ou null si non trouvé
  // ---------------------------------------------------------------------------
  getClientById(id) {
    return this._clients.find(client => client.id === id) || null;
  }

  // ---------------------------------------------------------------------------
  // getAllClients() → [{ id, nom }, ...]
  // ---------------------------------------------------------------------------
  getAllClients() {
    // Retourne une copie pour éviter la mutation externe
    return this._clients.map(client => ({ ...client }));
  }

  // ---------------------------------------------------------------------------
  // getClientCount() → nombre de clients
  // ---------------------------------------------------------------------------
  getClientCount() {
    return this._clients.length;
  }
}

module.exports = DataClientProvider;