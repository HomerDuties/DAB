// =============================================================================
// DataCompteProvider.js — FOURNISSEUR DE DONNÉES COMPTES
// =============================================================================
// RÔLE — Une seule responsabilité : fournir des données Comptes depuis un JSON.
// Ne connaît PAS les classes métier (Compte, etc.).
// Retourne des objets littéraux purs (POJO).
// =============================================================================

const fs = require("fs");
const path = require("path");

class DataCompteProvider {
  constructor() {
    // Chargement des données une fois au démarrage (mémoire)
    this._comptes = this._chargerJSON("comptes.json");
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
  // getCompteByIban(iban) → { iban, label, type, solde, clientId } ou null
  // ---------------------------------------------------------------------------
  getCompteByIban(iban) {
    return this._comptes.find(compte => compte.iban === iban) || null;
  }

  // ---------------------------------------------------------------------------
  // getComptesByClientId(clientId) → [{ iban, label, type, solde }, ...]
  // ---------------------------------------------------------------------------
  getComptesByClientId(clientId) {
    return this._comptes
      .filter(compte => compte.clientId === clientId)
      .map(compte => ({ ...compte }));
  }

  // ---------------------------------------------------------------------------
  // getCompteByLabel(clientId, label) → { iban, label, type, solde, clientId }
  // Utile quand on connaît le label ("courant", "epargne") mais pas l'IBAN
  // ---------------------------------------------------------------------------
  getCompteByLabel(clientId, label) {
    return this._comptes.find(
      compte => compte.clientId === clientId && compte.label === label
    ) || null;
  }

  // ---------------------------------------------------------------------------
  // getAllComptes() → [{ iban, label, type, solde, clientId }, ...]
  // ---------------------------------------------------------------------------
  getAllComptes() {
    // Retourne une copie pour éviter la mutation externe
    return this._comptes.map(compte => ({ ...compte }));
  }

  // ---------------------------------------------------------------------------
  // getCompteCount() → nombre de comptes
  // ---------------------------------------------------------------------------
  getCompteCount() {
    return this._comptes.length;
  }
}

module.exports = DataCompteProvider;