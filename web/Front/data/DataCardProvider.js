// =============================================================================
// DataCardProvider.js — FOURNISSEUR DE DONNÉES CARTES
// =============================================================================
// RÔLE — Une seule responsabilité : fournir des données Cartes depuis un JSON.
// Ne connaît PAS les classes métier (CarteBancaire, etc.).
// Retourne des objets littéraux purs (POJO).
// =============================================================================

const fs = require("fs");
const path = require("path");

class DataCardProvider {
  constructor() {
    // Chargement des données une fois au démarrage (mémoire)
    this._cartes = this._chargerJSON("cartes.json");
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
  // getCardByNumero(numero) → { numero, codePin, clientId } ou null
  // Recherche par numéro de carte (clé métier)
  // ---------------------------------------------------------------------------
  getCardByNumero(numero) {
    // Normalise le numéro (enlève les espaces) pour la recherche
    const numeroNormalise = numero.replace(/\s/g, "");
    return this._cartes.find(carte => carte.numero === numeroNormalise) || null;
  }

  // ---------------------------------------------------------------------------
  // getCardsByClientId(clientId) → [{ numero, codePin, clientId }, ...]
  // Recherche toutes les cartes d'un client
  // ---------------------------------------------------------------------------
  getCardsByClientId(clientId) {
    return this._cartes
      .filter(carte => carte.clientId === clientId)
      .map(carte => ({ ...carte }));
  }

  // ---------------------------------------------------------------------------
  // getAllCards() → [{ numero, codePin, clientId }, ...]
  // ---------------------------------------------------------------------------
  getAllCards() {
    // Retourne une copie pour éviter la mutation externe
    return this._cartes.map(carte => ({ ...carte }));
  }

  // ---------------------------------------------------------------------------
  // getCardCount() → nombre de cartes
  // ---------------------------------------------------------------------------
  getCardCount() {
    return this._cartes.length;
  }

  // ---------------------------------------------------------------------------
  // validatePin(numero, codePin) → true/false
  // Vérifie si le code PIN correspond à la carte
  // ---------------------------------------------------------------------------
  validatePin(numero, codePin) {
    const carte = this.getCardByNumero(numero);
    return carte !== null && carte.codePin === codePin;
  }
}

module.exports = DataCardProvider;