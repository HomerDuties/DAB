// =============================================================================
// Authenticateur — Classe MÉTIER (politique de sécurité du code)
// =============================================================================
// Responsabilité unique : compter les échecs et bloquer l'accès après un
// nombre maximal de tentatives (besoin 1).
//
// C'est une classe métier qui porte DE L'ÉTAT DE SÉCURITÉ : le compteur
// d'échecs et l'état de blocage. Le code (PIN), lui, appartient à la CARTE
// (CarteBancaire) — chaque client a le sien. L'authentificateur ne connaît
// PAS le code : il compare la saisie via carte.verifierPin(code) puis gère
// le RISQUE (échecs répétés → blocage).
//
// Frontière donnée / métier (exercice perfect) :
//   - carte.verifierPin(code) = comparaison sur SA donnée  → classe DONNÉE
//   - compter les échecs / bloquer = décision de sécurité  → classe MÉTIER (ici)
//
// Gestion fine des paramètres :
//   - Constructeur (essentiel pour EXISTER) :
//       tentativesMaximales: (optionnel, défaut 3) seuil de blocage
//   - Méthode valider(carte, pinSaisi) : reçoit la CARTE (qui porte son
//       code) + la DONNÉE VARIABLE par appel (le code tapé à cet instant).
// =============================================================================

class Authenticateur {
  constructor(tentativesMaximales = 3) {
    this.tentativesMaximales = tentativesMaximales;
    this.tentativesEchouees = 0;
    this.bloque = false;
  }

  // Valide le code tapé contre le code de la CARTE (carte.verifierPin).
  // La comparaison est une navigation de la carte (donnée) ; ici on gère la
  // POLITIQUE : réinitialiser le compteur en cas de succès, bloquer en cas
  // de dépassement du seuil. Retourne un booléen.
  valider(carte, pinSaisi) {
    if (this.bloque) {
      return false;
    }

    if (carte.verifierPin(pinSaisi)) {
      this.tentativesEchouees = 0;
      return true;
    }

    this.tentativesEchouees += 1;
    if (this.tentativesEchouees >= this.tentativesMaximales) {
      this.bloque = true;
    }
    return false;
  }

  // Indique si l'authentificateur est actuellement bloqué.
  estBloque() {
    return this.bloque;
  }
}

module.exports = Authenticateur;