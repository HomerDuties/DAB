# 🎓 Ma Progression dans l'Apprentissage du SRP

> **Single Responsibility Principle** — "Une classe, une responsabilité, un point de changement"

---

## 📅 Journal de Bord

### Session 1 — 14 Octobre 2026

**Projet analysé :** DAB (Distributeur Automatique de Billets)  
**Fichier analysé :** `web/Front/server.js` (227 lignes)

---

## 🎯 Objectifs d'Apprentissage

- [ ] Comprendre ce qu'est une "responsabilité"
- [ ] Savoir identifier une violation SRP
- [ ] Connaître les signes qui trahissent une violation SRP
- [ ] Savoir nommer les classes selon leur responsabilité
- [ ] Comprendre quand SRP est overkill (pragmatisme)
- [ ] Être capable de refactorer en appliquant SRP

---

## 📝 Notes de la Session en Cours

### Fichier : `server.js`

**Première impression :**
> _[À remplir pendant la discussion]_

**Responsabilités identifiées (par l'étudiant) :**
> _[À remplir]_

**Responsabilités identifiées (par le Professeur) :**

| # | Responsabilité | Lignes | Fonction(s) |
|---|----------------|--------|-------------|
| 1 | Imports du domaine | 30-41 | `require(...)` |
| 2 | Construction du Core | 51-90 | `construireCore()` |
| 3 | Création du serveur HTTP | 98-104 | `creerServeur()` |
| 4 | Routing des requêtes | 109-151 | `handle()` |
| 5 | Lecture du corps JSON | 157-172 | `lireCorpsJson()` |
| 6 | Envoi des réponses JSON | 174-180 | `envoyerJson()` |
| 7 | Service des fichiers statiques | 184-200 | `resoudreStatique()`, `servirStatique()` |
| 8 | Mapping MIME | 202-211 | `typesMime` |
| 9 | Lancement du serveur | 214-225 | `if (require.main === module)` |

**Verdict SRP (à définir ensemble) :**
- [ ] SRP respecté ✅
- [ ] SRP violé ❌
- [ ] Pragmatique (SRP overkill) 🤷

**Justification :**
> _[À remplir après discussion]_

---

## 🚧 Points de Blocage Identifiés

> _Ces points sont à remplir quand l'étudiant montre une incompréhension ou une hésitation_

### Blocage #1 — [Titre à définir]

**Observation :**
> _[Décrire la situation où le blocage est apparu]_

**Question posée par l'étudiant :**
> _[Citation de la question]_

**Réponse du Professeur :**
> _[Explication donnée]_

**Exercice pour débloquer :**
> _[À créer si nécessaire]_

---

### Blocage #2 — [Titre à définir]

**Observation :**
> _[Décrire la situation où le blocage est apparu]_

---

## 💡 Découvertes et "Aha!" Moments

> _Moments où l'étudiant a compris un concept important_

### Découverte #1 — [Titre]

**Ce qui a été compris :**
> _[Description]_

**Citation de l'étudiant :**
> _[Si l'étudiant a exprimé sa compréhension]_

---

## 📚 Concepts Clés à Retenir

### 1. Qu'est-ce qu'une "responsabilité" ?

**Définition :**
> Une responsabilité est une **raison de changer** pour une classe.

**Question à se poser :**
> *"Si [X] change, est-ce que cette classe doit changer ?"*
> Si oui pour plusieurs X indépendants → plusieurs responsabilités.

---

### 2. Les signes qui trahissent une violation SRP

| Signe | Exemple | Pourquoi c'est mauvais |
|-------|---------|------------------------|
| Nom avec "and" | `UserManagerAndEmailer` | 2 responsabilités dans le nom |
| Nom trop vague | `Manager`, `Service`, `Utils` | Ne décrit pas UNE responsabilité |
| Trop d'imports | 10+ `require()` différents | Dépend de trop de choses |
| > 200 lignes | Une classe de 500 lignes | Probablement trop de responsabilités |
| "God class" | Tout le monde l'importe | Centralise trop de logique |

---

### 3. Patterns de nommage SRP-friendly

| Suffixe | Responsabilité | Exemple |
|---------|----------------|---------|
| `Validator` | Valider des données | `OrderValidator` |
| `Repository` | Accès données (CRUD) | `OrderRepository` |
| `Notifier` / `Sender` | Envoyer des notifications | `EmailNotifier` |
| `Calculator` | Calculs | `PricingCalculator` |
| `Factory` | Création d'objets | `OrderFactory` |
| `Handler` | Traiter un événement | `PaymentHandler` |
| `Router` / `Dispatcher` | Aiguiller des requêtes | `HttpRouter` |
| `Builder` | Construction étape par étape | `OrderBuilder` |
| `Mapper` / `Transformer` | Conversion de données | `UserDtoMapper` |
| `Configurator` / `Composer` | Assembler des dépendances | `CoreComposer` |

---

### 4. Quand SRP est-il overkill ?

**SRP est essentiel quand :**
- La classe a > 3 raisons de changer
- Les tests sont difficiles (trop de mocks)
- Le code est difficile à comprendre
- Les conflits Git sont fréquents sur ce fichier

**SRP est overkill quand :**
- Le projet est très petit (< 1000 lignes)
- Les responsabilités sont fortement couplées
- Le découpage rendrait le code plus complexe
- C'est du code "infrastructure" simple (ex: un petit serveur HTTP)

**Question à se poser :**
> *"Est-ce que découper m'aide ou me complique la vie ?"*

---

## 🔄 Évolution de la Pensée

### Avant cette session

**Ma compréhension du SRP :**
> _[À remplir en début de session]_

**Exemple de code que je pensais SRP-friendly :**
> _[À remplir]_

---

### Après cette session

**Ma nouvelle compréhension du SRP :**
> _[À remplir en fin de session]_

**Ce qui a changé dans ma façon de voir le code :**
> _[À remplir]_

---

## 📋 Prochaines Étapes

### Fichiers à analyser ensuite

- [ ] `web/Back/core-manager.js` (527 lignes) — Le cerveau de l'appli
- [ ] `web/Front/front-action-dealer.js` (66 lignes) — Requêteur HTTP
- [ ] `Metier/DABOrchestrator.js` — Orchestration du domaine

### Exercices à faire

- [ ] Identifier les responsabilités dans `core-manager.js`
- [ ] Proposer un découpage SRP pour `server.js` (si violé)
- [ ] Comparer avec le code Métier (déjà SRP-friendly)

### Concepts à approfondir

- [ ] La différence entre "couplage fort" et "responsabilité unique"
- [ ] Comment tester qu'une classe respecte SRP
- [ ] SRP vs DRY (parfois en tension)

---

## 🎯 Défis Personnels

### Défi #1 — Nommer sans "et"

**Objectif :** Nommer 5 classes sans utiliser "and", "or", "with" dans le nom

**Progress :** 0/5

---

### Défi #2 — Identifier en 5 secondes

**Objectif :** Repérer une violation SRP en moins de 5 secondes

**Progress :** À évaluer

---

## 📖 Citations à Retenir

> *"Une classe, une raison de changer. C'est tout. Rien que ça."*

> *"Si tu ne peux pas décrire la responsabilité d'une classe en une phrase simple sans utiliser 'et', le nom est probablement trop vague ou la classe fait trop de choses."*

> *"Le nom doit refléter l'unique responsabilité."*

> *"On découpe quand ça aide, pas quand ça complique."*

---

## 📝 Glossaire Personnel

| Terme | Ma définition | Exemple |
|-------|---------------|---------|
| Responsabilité | _[À remplir]_ | _[À remplir]_ |
| Raison de changer | _[À remplir]_ | _[À remplir]_ |
| Couplage fort | _[À remplir]_ | _[À remplir]_ |
| Injection de dépendance | _[À remplir]_ | _[À remplir]_ |
| God class | _[À remplir]_ | _[À remplir]_ |

---

## 🏆 Victoires à Célébrer

### Victoire #1 — [Titre]

**Date :** _[Date]_

**Ce qui a été accompli :**
> _[Description]_

---

## 📬 Questions en Suspens

> _Questions à poser au Professeur lors des prochaines sessions_

1. _[À remplir]_
2. _[À remplir]_

---

**Dernière mise à jour :** 14 Octobre 2026  
**Prochaine session :** À planifier