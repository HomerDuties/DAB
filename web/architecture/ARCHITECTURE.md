# DAB web — Architecture visuelle (Mermaid)

> Trois schémas complémentaires pour « voir » l'architecture :
> 1. **Le chemin de l'information** (flowchart) — suis un clic : 3 zones empilées, chacune lue **de gauche à droite**. En bas la **demande** (flèches pleines ①→⑤) part du clic vers les règles ; en haut la **réponse** (pointillés ⑥→⑨) revient vers l'écran ; au milieu **l'UI/l'écran** (①), d'où tout part et où tout revient. Le trajet est une **boucle** : écran → règles → écran.
> 2. **Le diagramme de classes** (classDiagram) — qui fait quoi, qui appelle qui, en une seule image statique.
> 3. **Le parcours dans le temps** (sequenceDiagram) — la version la plus fine, étape par étape.
>
> 📖 Le contrat textuel complet reste dans `../README.md`.

---

## 1. Le chemin de l'information — flowchart

> **Comment le lire** : chaque zone se lit **de gauche à droite**. Les flèches **pleines** (en bas) = la *demande* part du clic vers les règles. Les flèches **pointillées** (en haut) = la *réponse* revient vers l'écran. C'est une **boucle** : l'écran émet, les règles décident, l'écran affiche — puis un nouveau clic repart du ①.

```mermaid
flowchart TB
    subgraph ECR["🟨 L'UI / l'ÉCRAN — l'entrée et la sortie du trajet"]
        direction LR
        A1["① Le pavé — l'écran où l'on clique<br/>index.html • dab-ui.js"]
    end
    subgraph DEM["🟩 La DEMANDE — part du clic vers les règles (flèches pleines ➡)"]
        direction LR
        A2["② front-action-dealer.js<br/>(le requêteur : fait les fetch)"] --> A3["③ server.js (L133)<br/>(le pompiste : transporte)"] --> A4["④ core-manager.js (L95)<br/>(le cerveau : joue le geste)"] --> A5["⑤ DABOrchestrator.executer()<br/>../DAB/* (les vraies règles)"]
    end
    subgraph REP["🟦 La RÉPONSE — revient vers l'écran (flèches pointillées ➡)"]
        direction LR
        R1["⑥ etatCourant() L110<br/>(copie stricte de l'état)"] --> R2["⑦ envoyerJson() L168<br/>(objet → texte JSON)"] --> R3["⑧ client : response.json()<br/>(objet pur)"] --> R4["⑨ UI : afficher(etat)<br/>(écran redessiné)"]
    end
    ECR --> DEM
    DEM -. "état modifié, soldes…" .-> REP
    REP -. "un nouveau clic repart du ①" .-> ECR
    linkStyle 7,8 stroke:#d64545,stroke-width:3px
```

**Légende des étapes (avec les lignes de code) :**

| Étape | Fichier : ligne | Ce qui se passe réellement |
|---|---|---|
| ① | index.html / dab-ui.js | tu cliques → dab-ui.js fabrique `{ action, payload }` |
| ② | front-action-dealer.js | `transmettre()` → `fetch POST /api/agir` (L46-49) |
| ③ | server.js **L124 → L133** | route `POST /api/agir` → `lireCorpsJson` L161 → `core.agir()` L133 |
| ④ | core-manager.js **L95 → L104** | `agir()` → `_gestionnaires[action].fn(payload)` → modifie `this.etat` |
| ⑤ | ../DAB/DABOrchestrator | si le geste implique une opération : construire + `executer(operation)` |
| ⑥ | core-manager.js **L110 → L111** | `etatCourant()` renvoie une **copie stricte** (deep clone) de l'état |
| ⑦ | server.js **L168** | `envoyerJson()` sérialise l'objet en texte JSON |
| ⑧ | front-action-dealer.js | `response.json()` → re-objet |
| ⑨ | dab-ui.js | `afficher(etat)` redessine l'écran |

> Le core ne connaît ni le réseau ni l'écran ; le serveur ne pense pas ; la vue ne décide rien.
> **Chaque fichier fait une seule chose**, et le contrat est toujours le même : `action + payload → core → nouvel état`.

---

## 2. Le diagramme de classes

> **Lecture** : les **boîtes** = fichiers / responsabilités ; **flèche pointillée** = « appelle / dépend de » ; **flèche pleine** = « renvoie des données à ». Les notes ❗ rappellent les règles d'or.

```mermaid
classDiagram
    %% ===========================================================
    %% STRUCTURE : qui détient quoi, qui appelle qui
    %% ===========================================================
    class UI {
        +afficher(etat)
        +creerAction(nom, payload)
    }
    class ClientVue {
        +envoyer(action, payload)
        +obtenirEtat()
        +reinitialiser()
        -fetchJSON()
    }
    class Serveur {
        +core : CoreManager
        +handle(req, res)
        +lireCorpsJson(req)
        +envoyerJson(res, objet)
    }
    class CoreManager {
        +etat : Object
        -gestionnaires : Map
        +agir(action, payload)
        +etatCourant()
    }
    class DomaineDAB {
        +executer(operation)
        +authentifier()
        +retirer()
    }
    class DTOEtat {
        +ecran
        +message
    }
    UI ..> ClientVue : délègue les actions
    ClientVue ..> Serveur : fetch HTTP /api/* (agir / etat / reset)
    Serveur ..> CoreManager : core.agir(action, payload)
    CoreManager ..> DomaineDAB : DABOrchestrator.executer(operation)
    DomaineDAB --> CoreManager : soldes / reçu
    CoreManager --> Serveur : etatCourant() (copie stricte)
    Serveur --> ClientVue : texte JSON
    ClientVue --> UI : objet état (JSON.parse)
    CoreManager ..> DTOEtat : produit la copie
    Serveur ..> DTOEtat : transporte
    ClientVue ..> DTOEtat : parse
    UI ..> DTOEtat : lit pour afficher
    note for UI "❗ la vue : ne fait qu'afficher(etat)"
    note for ClientVue "❗ le SEUL fichier de la vue qui parle au réseau"
    note for Serveur "❗ le transport : ne contient AUCUNE règle métier"
    note for CoreManager "❗ le cerveau : ne voit jamais le réseau ni l'écran"
    note for DomaineDAB "❗ le métier : les vraies règles (../DAB/*)"
    note for DTOEtat "l'objet qui voyage sur le réseau (sérialisé en JSON)"
```

---

## 3. Le parcours dans le temps — sequence

> Le même voyage que la section 1, mais **instance par instance** : l'ordre exact des appels et des retours, avec les lignes de code qui vont avec.

```mermaid
sequenceDiagram
    autonumber
    participant U as Toi (clics sur l'écran)
    participant UI as dab-ui.js (peintre)
    participant CL as front-action-dealer.js (requêteur)
    participant SV as server.js (pompiste)
    participant MA as core-manager.js (cerveau)
    participant DO as domaine DAB (métier)

    U->>UI: "clic touche « 4 » du pavé (dab-ui.js L127)"
    UI->>CL: "envoyer('chiffre', { chiffre: '4' })  (dab-ui.js L32)"
    CL->>SV: "fetch POST /api/agir  → body = JSON.stringify({ action, payload })  (client L46-49)"
    Note over SV: "lireCorpsJson L154 → brut accumulé → JSON.parse L161"
    SV->>MA: "core.agir('chiffre', { chiffre: '4' })  (server.js L133)"
    Note over MA: "agir L95 → _gestionnaires['chiffre'].fn(payload) L104 → modifie this.etat"
    MA->>DO: "(si opération) construire l'opération → DABOrchestrator.executer(operation)"
    DO-->>MA: "reçu du domaine (soldes, reçu…)"
    MA-->>SV: "etatCourant() L110 → copie stricte L111"
    SV-->>CL: "envoyerJson() L168 → texte JSON"
    CL-->>UI: "response.json() L34 → objet état"
    UI-->>U: "afficher(etat) L45 : l'écran est redessiné"
    Note over MA: "le PIN reste un secret privé : l'état renvoyé ne le contient jamais"
```

> **À retenir** : quel que soit le geste ou l'écran, le contrat est toujours `action + payload → core → nouvel état`.

---

## 4. Où poser tes points d'arrêt (pour voir le voyage en vrai)

| Couche | Fichier : ligne | Ce que tu observeras (panneau Variables) |
|---|---|---|
| Pompiste | `server.js` **L133** | `corps.action` / `corps.payload` reçus du navigateur |
| Cerveau | `core-manager.js` **L95** | l'`action` et le `payload` entrent dans `agir(...)` |
| Cerveau | `core-manager.js` **L104** | le gestionnaire `entree` choisi pour ce geste |
| Cerveau | `core-manager.js` **L111** | `this.etat` juste avant le clonage (écran suivant) |

> ⚠️ Les fichiers de la vue (`index.html`, `dab-ui.js`, `front-action-dealer.js`) vivent **dans le navigateur** :
> le débogueur **F5** (Node) ne les traverse pas. Pour les voir : **F12 → Réseau** (les fetch) ou **F12 → Sources** (points d'arrêt navigateur).

---

## 5. Comment afficher ces schémas

- **GitHub** : ouvrez ce fichier `.md` — les blocs `mermaid` sont rendus automatiquement.
- **VS Code** : installez l'extension **« Markdown Preview Mermaid Support »** puis faites **Ctrl+Shift+V** sur ce fichier (*cmd+shif+v sur Mac*).
- **Sans rien installer** : collez le code d'un bloc dans **https://mermaid.live** (rendu instantané).
- **Sans Markdown du tout** : les 4 schémas sont pré-rendus en SVG dans ce dossier — `archiDAB_server.svg` / `archiDAB_hauteur.svg` (flowchart en 3 bandes), `archiDAB_classes.svg` (classes), `archiDAB_sequence.svg` (séquence), `archiDAB_cablage.svg` (câblage / dépendances) ; ouvrez-les dans un navigateur ou glissez-les dans un doc.

---

## 6. Le diagramme de câblage — « qui new qui » (l'envers du décor)

> Le schéma en 3 bandes (section 1) montre des **couches** ; celui-ci montre l'**assemblage réel** du serveur (`server.js :: construireCore()`, L51→L90 : ≈ 14 « new » en 40 lignes). Il révèle pourquoi le code paraît « fouilli » alors que l'architecture est simple :
> - une classe qui **se construit des objets elle-même** (le `Client` fabrique son `InfoClient`),
> - un service **composé dans un autre** (`PaiementFactureService` possède un `VirementService`),
> - le **core qui fabrique des opérations à la volée** (`operations.js`),
> - et un domaine (32 fichiers) environ **×3 plus gros** que ce que le serveur ne branche réellement (le reste est câblé par `main.js`).

```mermaid
flowchart TB
    %% Le bloc source vit aussi dans CABLAGE.mmd (rendu : archiDAB_cablage.svg)
    RACINE["🏗 server.js :: construireCore()<br/>LA RACINE DE COMPOSITION<br/>(L51→L90 : ≈ 14 « new » exposés en 40 lignes)"]:::root

    subgraph D["① DONNÉES — instanciées par la racine (classes données)"]
        PROF["ClientProfile<br/>scoreFiabilite 90"]:::data
        COUR["Compte « courant »<br/>solde 1000 €"]:::data
        EPAR["Compte « épargne »<br/>solde 500 €"]:::data
        CLI["Client #1<br/>profil + comptes"]:::data
        INFOC["InfoClient<br/>(nom, email…)"]:::source
        CAR["CarteBancaire<br/>PIN 1234"]:::data
        CEDF["Compte « edf »<br/>(créancier externe)"]:::data
        FAC["Facture EDF-2026-001<br/>120 €"]:::data
        ANN["annuaireClients<br/>{1: client}"]:::data
    end

    subgraph S["② SERVICES — 4 classes métier opérationnelles"]
        VS["VirementService"]:::svc
        DS["DepotService"]:::svc
        RS["RetraitService"]:::svc
        PFS["PaiementFactureService"]:::svc
    end

    subgraph O["③ ORCHESTRATION — Authenticateur + annuaire"]
        AUTH["Authenticateur (3 essais)"]:::svc
        ORC["DABOrchestrator<br/>auth + catalogueClients"]:::svc
    end

    M["④ CORE — CoreManager<br/>(état de l'appli + registres privés)"]:::core

    OP["operations.js<br/>Session · Consultation · Dépôt · Retrait ·<br/>Virement · PaiementFacture —<br/>construites À LA VOLÉE par le core"]:::side

    EXTRA["⚙️ main.js (CLI) câble EN PLUS :<br/>calculateurs de découvert, frais 0,5 %,<br/>plafonds (500 €/j, 5000 €), devises,<br/>virements inter-client / international,<br/>registres, carnet d'opérations…<br/>→ le domaine (32 fichiers) ≈ ×3 le câblage du serveur"]:::side

    RACINE --> PROF
    RACINE --> COUR
    RACINE --> EPAR
    RACINE --> CLI
    RACINE --> CAR
    RACINE --> CEDF
    RACINE --> FAC
    RACINE --> VS
    RACINE --> DS
    RACINE --> RS
    RACINE --> PFS
    RACINE --> AUTH
    RACINE --> ORC
    RACINE -->|"new CoreManager({ orchestreur, services, cartes, factures })"| M

    PFS -->|"possède virementService (injecté)"| VS
    CLI -. "construit SON InfoClient tout seul<br/>(Fabrique → clients.json)" .-> INFOC
    ORC -->|authenticateur| AUTH
    ORC -->|catalogueClients| ANN
    ANN --> CLI
    ORC -. "carte → idProprietaire → client" .-> CLI
    FAC -->|compteEmetteur| CEDF
    M -->|"orchestreur (agir → executer)"| ORC
    M -. "construit l'opération du geste à la volée" .-> OP
    OP -->|"orchestreur.executer(operation)"| ORC
    RACINE -. "le serveur n'expose QUE les 5 opérations simples" .-> EXTRA

    classDef root fill:#d64545,stroke:#fff,color:#fff,stroke-width:2px
    classDef data fill:#2c3e50,stroke:#7f9cbd,color:#fff
    classDef svc fill:#1e5f5a,stroke:#7cc9bd,color:#fff
    classDef core fill:#4b2e83,stroke:#c9aaf2,color:#fff
    classDef source fill:#4a4a4a,stroke:#b0b0b0,color:#eee
    classDef side fill:#3d2f00,stroke:#e0b84c,color:#ffeebb
```

> **À retenir** : chaque exécutable (serveur, `main.js`, `test-core-manager.js`) a **SA propre racine de composition** qui « new » son monde. Le serveur ne branche que **4 services opérationnels** — le reste du domaine (plafonnés, frais, découvert, devises, inter-client…) existe, fonctionne et se teste via `main.js`, mais reste hors de l'API.
