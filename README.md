# Projet DAB — Analyse SRP avec le Professeur SOLID

## 🎯 Objectif

Analyser l'architecture de la partie **WEB** (échange client/serveur HTTP) sous l'angle du **Single Responsibility Principle (SRP)**.

## 📁 Structure du projet

```
projet-dab/
├── web/
│   ├── Front/
│   │   ├── server.js              # Serveur HTTP (le "pont")
│   │   ├── front-action-dealer.js # Requêteur HTTP (côté navigateur)
│   │   ├── dab-ui.js              # Affichage UI
│   │   └── Etat.js                # Gestion d'état
│   └── Back/
│       ├── core-manager.js        # Cerveau de l'application
│       └── test-core-manager.js   # Tests du core
├── Metier/                        # Domaine métier (déjà SRP-friendly)
│   ├── operations.js
│   ├── DABOrchestrator.js
│   ├── Authenticateur.js
│   ├── VirementService.js
│   ├── RetraitService.js
│   ├── DepotService.js
│   └── ... (32 fichiers)
└── README.md                      # Ce fichier
```

## 🔍 Questions pour l'analyse SRP

### Pour chaque fichier, demande-toi :

1. **Quelle est son unique responsabilité ?**
2. **Combien de raisons de changer a-t-il ?**
3. **Le nom reflète-t-il une seule responsabilité ?**
4. **Pourrait-on le découper en plusieurs classes ?**

## 📊 Points à analyser

### 1. `server.js` (227 lignes)

**Responsabilités potentielles :**
- [ ] Configuration HTTP (createServer)
- [ ] Routing des requêtes (handle)
- [ ] Lecture du corps JSON (lireCorpsJson)
- [ ] Envoi des réponses JSON (envoyerJson)
- [ ] Gestion des fichiers statiques (resoudreStatique, servirStatique)
- [ ] Construction du Core (construireCore)
- [ ] Injection de dépendances (new Compte, new Client, etc.)

**Question :** *Est-ce que `server.js` a une seule responsabilité ou plusieurs ?*

---

### 2. `core-manager.js` (527 lignes)

**Responsabilités potentielles :**
- [ ] Gestion des actions utilisateur (agir)
- [ ] Table de transitions (_gestionnaires)
- [ ] Navigation entre écrans (_allerMenu, _allerSaisieCode, etc.)
- [ ] Construction des opérations (_construireOperation)
- [ ] Exécution métier (_executerOperation, _executerConsultation)
- [ ] Validation du code (_validerCode)
- [ ] Validation du montant (_validerMontantEtExecuter)
- [ ] Gestion des registres privés (_cartesParId, _facturesParReference)
- [ ] Formatage de l'affichage (_euros, _masquerNumero, _construireLignesRecu)

**Question :** *La classe CoreManager respecte-t-elle le SRP ?*

---

### 3. `front-action-dealer.js` (66 lignes)

**Responsabilités :**
- [ ] Obtenir l'état (obtenirEtat)
- [ ] Transmettre une action (transmettre)
- [ ] Réinitialiser (reinitialiser)

**Question :** *Ce fichier a-t-il une responsabilité unique ou triple ?*

---

## 🎓 Démarche pédagogique

1. **Lire le code** d'un fichier
2. **Identifier les responsabilités** (faire la liste)
3. **Compter les raisons de changer**
4. **Proposer un découpage SRP** si nécessaire
5. **Discuter du trade-off** (SRP vs pragmatisme)

## 📝 Session de travail

### Prochaine étape

Ouvre `server.js` et `core-manager.js`, puis dis-moi :

> *"Selon toi, quel fichier on analyse en premier ? Et combien de responsabilités tu lui trouves ?"*

---

## 📚 Ressources

- `web/README.md` — Contrat agir/état
- `web/architecture/ARCHITECTURE.md` — Diagrammes Mermaid
- `C:/auto/opencode/skills/prof-solid/SKILL.md` — Le guide du Professeur SOLID