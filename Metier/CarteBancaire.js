// =============================================================================
// CarteBancaire — Classe DONNÉE (la carte du client)
// =============================================================================
// Responsabilité unique : PORTER les données de la carte : son numéro, son
// CODE (PIN) et l'identifiant de son propriétaire.
//
// C'est une classe DONNÉE, comme InfoClient ou Compte. Elle ne décide AUCUNE
// politique : elle répond aux questions de NAVIGATION. Exemples :
//   - getNumero()            -> « quel est ton numéro ? »
//   - getIdProprietaire()    -> « qui est ton propriétaire ? » (lien id)
//   - verifierPin(code)      -> « ce code est-il le bon ? » → oui/non
// La comparaison du code est une navigation sur SA PROPRE donnée (comme
// Compte.peutCouvrir) : elle ne décide rien, elle constate. La carte garde
// son secret pour elle — elle ne l'EXPOSE jamais (pas de getPin()).
//
// Gestion fine des paramètres :
//   - Constructeur (essentiels pour exister) : numero, pin, idProprietaire.
//   - verifierPin(codeSaisi) : la DONNÉE VARIABLE par appel (le code tapé).
// =============================================================================

class CarteBancaire {
  constructor(numero, pin, idProprietaire) {
    this.numero = numero;
    this.pin = pin;
    this.idProprietaire = idProprietaire;
  }

  // Consultation (navigation).
  getNumero() {
    return this.numero;
  }

  // Lien vers le propriétaire (navigation), résolu par l'orchestrateur.
  getIdProprietaire() {
    return this.idProprietaire;
  }

  // Comparaison du code tapé contre SON code (navigation sur sa propre donnée).
  // Ne décide rien (pas de compteur, pas de blocage) : c'est l'AUTHENTIFICATEUR
  // qui porte la politique (échecs, blocage). Oui/non uniquement.
  verifierPin(codeSaisi) {
    return codeSaisi === this.pin;
  }
}

module.exports = CarteBancaire;
