# CoreManager — le contrat `agir` / `etat`

> Petit mémo : *ce qui tient debout, c'est la séparation entre le **core**
> (qui décide) et la **vue** (qui affiche).* Tout le reste découle de ce contrat.

## L'idée en une phrase

> **La vue ne fait que deux choses : envoyer une action, puis réafficher l'état
> reçu. Jamais l'inverse.**

```
   Vue  ── agir(action, payload) ──▶  CoreManager ──┐
    ▲                                              │
    └──────────  etatCourant() → JSON ◀────────────┘
              (cloné, sérialisable, sans secret)
```

- La **vue** ne connaît ni le domaine, ni les services, ni le PIN.
- Le **core** (`web/core-manager.js`) est pur et testable sans navigateur
  (`web/test-core-manager.js`).
- Le **domaine** (`DAB/`) est intouché : le core ne fait que lui construire
  des opérations et l'appeler via `orchestreur.executer(...)`.

## Le contrat en 3 règles

1. **Tout est action.** L'utilisateur ne « fait » jamais rien dans le domaine :
   il envoie `{ action, payload }`. Ex. `agir("chiffre", { chiffre: "4" })`.
2. **Tout est état.** Chaque action renvoie **un nouvel état JSON** (copie
   stricte via `JSON.parse(JSON.stringify(...))`) : la vue le réaffiche, puis
   oublie le précédent.
3. **Le core ne lève jamais d'erreur.** Un geste invalide (ou un refus
   métier du type « Fonds insuffisants. ») est rangé dans `etat.erreur` et
   affiché à l'écran. La vue ne gère pas d'exception utilisateur.

## Le catalogue des actions (et où elles sont légales)

Chaque action n'est acceptée que sur certaines **phases d'écran** ; ailleurs,
`agir()` répond par `etat.erreur` sans changer de phase.

| Action | Payload utile | Phase(s) autorisée(s) |
|---|---|---|
| `insererCarte` | `{ carteId }` | `accueil` |
| `chiffre` | `{ chiffre }` | `saisie_code`, `saisie_montant` |
| `effacer` | — | `saisie_code`, `saisie_montant` |
| `valider` | — | `saisie_code`, `saisie_montant` |
| `annuler` | — | `saisie_code`, `choix_compte`, `choix_compte_cible`, `saisie_montant`, `choix_facture` |
| `choisirOperation` | `{ operation }` (`consulter`, `retirer`, `deposer`, `virer`, `payer`) | `menu` |
| `choisirCompte` | `{ label }` | `choix_compte` |
| `choisirCompteCible` | `{ label }` | `choix_compte_cible` |
| `choisirFacture` | `{ reference }` | `choix_facture` |
| `continuer` | — | `resultat` |
| `rendreCarte` | — | `menu`, `resultat` |

## La forme de l'état (ce que la vue doit savoir afficher)

```js
{
  screen: "menu",            // la phase en cours → quel gabarit afficher
  message: "Bonjour Martin…",
  erreur: null,              // sinon, le refus à afficher en rouge
  saisie: "1234",            // chiffres en cours (PIN masqué par la vue)
  typeSaisie: "pin",         // "pin" | "montant" | null
  paveNumerique: true,       // clavier physique visible ?
  validerLabel: "Valider le code",  // libellé du bouton VALIDER
  carte: { numero: "•••• •••• •••• 9012", proprietaire: "Martin" },
  client: "Martin",
  comptes: [{ label: "courant", type: "courant", solde: 950 }],
  operationEnCours: "retirer",
  contexte: { labelCompte: "courant", labelCible: null, montant: 50, facture: null },
  options: [ { action: "continuer", label: "↩️ Retour au menu", payload: {} } ],
  recu: { entete: "Reçu — RetraitOperation", lignes: [ { label: "Montant", valeur: "50 €" } ] }
}
```

Règles de lecture :
- `options` = **la liste des boutons** : la vue n'a qu'à émettre
  `{ action: option.action, ...option.payload }`.
- Les soldes viennent **du domaine** (refaits après chaque opération) — la
  core ne calcule jamais d'argent.
- Aucun secret dans l'état : ni PIN, ni objet vivant du domaine.

## Exemple minimal (reprennable dans la vue)

```js
const etat = core.agir("insererCarte", { carteId: "martin" });
// afficher etat.screen + etat.options
const etat2 = core.agir("chiffre", { chiffre: "1" });      // ×4
const etat3 = core.agir("valider");                        // → menu
const etat4 = core.agir("choisirOperation", { operation: "consulter" });
// → resultat, etat4.recu contient le reçu
```

Piloter le core comme ci-dessus **sans aucune vue**, c'est exactement ce que
fait `web/test-core-manager.js` (40 assertions, les 5 opérations couvertes) :

```bash
node web/test-core-manager.js
```

## Nommage des couches (le Web, découpé)

| Fichier | Rôle | En résumé |
|---|---|---|
| `web/core-manager.js` | **`CoreManager`** (classe) | le **CORE** — reçoit, aiguille et dirige l'état de l'appli (porte d'entrée du BACK) |
| `web/public/front-action-dealer.js` | **`FrontActionDealer`** (constante) | le **requêteur HTTP** du front — le SEUL fichier de la vue qui parle au réseau (`transmettre`, `obtenirEtat`, `reinitialiser`) |
| `web/public/dab-ui.js` | la **vue** | dessine l'état reçu, émet `{ action, payload }` — aucun `fetch` |
| `web/server.js` | le **pont HTTP** | transporte l'action vers `CoreManager.agir()` et l'état JSON vers le front |

> Le **cerveau** vit dans `CoreManager` (côté serveur) : `agir(action, payload)` → nouvel état.
> Le front ne fait **que transporter** ce contrat ; aucune règle métier n'y habite.

## Pourquoi c'est primordial

- **Testabilité** : toute la logique d'écran se vérifie par `agir` → état, sans
  navigateur, sans DOM.
- **Sérialisation** : le serveur peut envoyer l'état tel quel à la vue (JSON) et
  recevoir `{ action, payload }` en retour — le même contrat sert en local.
- **Le domaine reste pur** : le core est le *seul* endroit qui appelle
  `orchestreur.executer(...)` ; elle construit les opérations avec leurs services
  injectés et ne fait que relayer leur reçu.
