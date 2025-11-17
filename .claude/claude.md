# Documentation Technique - Championnat Tennis de Table

Cette documentation est destinée à Claude et aux développeurs travaillant sur le projet. Elle décrit l'architecture, les structures de données, et les principaux algorithmes de l'application.

## Vue d'ensemble du projet

Application web de gestion de championnats de tennis de table multi-journées. Architecture monolithique en Vanilla JavaScript (6566 lignes dans [script.js](../script.js)), sans framework frontend.

**Stack technique** :
- HTML5 + CSS3 (Grid, Flexbox, animations)
- Vanilla JavaScript ES6+ (aucun framework)
- jsPDF 3.0.3 + html2canvas 1.4.1
- PWA (Service Worker + Manifest)
- LocalStorage pour persistance

## Architecture des données

### Structure principale : `championship`

```javascript
championship = {
    currentDay: 1,  // Journée active (numéro)
    days: {
        1: {
            players: {
                1: ["Joueur A", "Joueur B", ...],  // Division 1
                2: [...],  // Division 2
                3: [...]   // Division 3
            },
            matches: {
                1: [match, match, ...],  // Matchs Division 1
                2: [...],
                3: [...]
            },
            pools: {  // Système de poules (optionnel)
                enabled: false,
                divisions: {
                    1: {
                        poolSize: 5,
                        qualifiedPerPool: 2,
                        pools: [
                            {
                                id: 1,
                                players: [...],
                                matches: [...]
                            }
                        ],
                        finalPhase: {
                            quarterFinals: [...],
                            semiFinals: [...],
                            final: null,
                            thirdPlace: null
                        }
                    }
                }
            }
        },
        2: { ... },  // Journée 2
        3: { ... }   // etc.
    }
}
```

### Structure d'un match

```javascript
match = {
    player1: "Nom Joueur 1",
    player2: "Nom Joueur 2",  // ou "BYE" pour match exempt
    tour: 1,  // Numéro du tour (1-4)
    sets: [
        { player1Score: 11, player2Score: 8 },   // Set 1
        { player1Score: 9, player2Score: 11 },   // Set 2
        { player1Score: 11, player2Score: 7 }    // Set 3
    ],
    completed: true,  // true si le match est terminé
    winner: "Nom Joueur 1",  // null si non terminé
    timesPlayedBefore: 0,  // Nombre de fois que ces joueurs se sont affrontés avant
    isRematch: false,  // true si timesPlayedBefore > 0
    isBye: false  // true si match contre BYE
}
```

### Structure des statistiques joueur

```javascript
playerStats = {
    name: "Nom Joueur",
    matchesPlayed: 4,
    matchesWon: 3,
    matchesLost: 1,
    setsWon: 7,
    setsLost: 4,
    setsDiff: 3,
    pointsWon: 156,
    pointsLost: 142,
    pointsDiff: 14,
    totalPoints: 9,  // Points de classement (3 par victoire)
    winRate: 75.0,   // Pourcentage de victoires
    matches: [...]   // Historique des matchs
}
```

## Fonctions principales

### Gestion des joueurs

#### `addPlayer(playerName, day, division)`
- **Localisation** : [script.js:~500-550](../script.js)
- Ajoute un joueur à une division spécifique d'une journée
- Validation : nom non vide, pas de doublon dans la division
- Sauvegarde automatique via `saveChampionship()`

#### `removePlayer(playerName, day, division)`
- **Localisation** : [script.js:~550-600](../script.js)
- Supprime un joueur et tous ses matchs associés
- Affiche une modal avec l'impact (nombre de matchs supprimés)
- Confirmation obligatoire avant suppression

#### `editPlayerName(oldName, newName, day, division)`
- **Localisation** : [script.js:~850-950](../script.js)
- **Particularité** : Modification GLOBALE sur TOUTES les journées
- Met à jour le nom dans :
  - Liste des joueurs de chaque journée/division
  - Tous les matchs (player1, player2, winner)
  - Système de poules si activé
- Validation anti-doublon

#### `bulkAddPlayers(text, day, division)`
- **Localisation** : [script.js:~600-650](../script.js)
- Import depuis texte multi-lignes (un nom par ligne)
- Utilisé pour copier-coller ou import CSV
- Ignore les lignes vides

### Génération de matchs

#### `generateMatchesForDay(day, division)`
- **Localisation** : [script.js:~1200-1500](../script.js)
- **Algorithme principal** : Round-robin intelligent avec 4 tours
- **Étapes** :
  1. Récupération des joueurs de la division
  2. Mélange aléatoire initial
  3. Pour chaque tour (1 à 4) :
     - Génération de paires équilibrées
     - Priorisation des nouveaux matchs (jamais joués)
     - Si nécessaire, acceptation de rematches
     - Équilibrage du nombre de matchs par tour
  4. Sauvegarde des matchs générés

#### Détails de l'algorithme de génération

```javascript
// Pseudo-code simplifié
function generateMatchesForTour(players, tour, existingMatches) {
    availablePlayers = shuffle(players)
    matches = []

    while (availablePlayers.length >= 2) {
        player1 = availablePlayers[0]

        // Chercher un adversaire non rencontré
        opponent = findNewOpponent(player1, availablePlayers, allChampionshipMatches)

        if (!opponent) {
            // Si tous ont été rencontrés, prendre le moins rencontré
            opponent = findLeastPlayedOpponent(player1, availablePlayers)
        }

        match = createMatch(player1, opponent, tour)
        matches.push(match)

        availablePlayers.remove(player1, opponent)
    }

    return matches
}
```

#### `countMatchesBetweenPlayers(player1, player2)`
- **Localisation** : [script.js:~1100-1150](../script.js)
- Parcourt TOUTES les journées et divisions
- Compte le nombre de fois où deux joueurs se sont affrontés
- Utilisé pour minimiser les rematches

### Gestion des scores

#### `updateMatchScore(matchIndex, setIndex, player, score, day, division)`
- **Localisation** : [script.js:~1800-1900](../script.js)
- Met à jour le score d'un set
- Appelle `checkMatchCompletion()` après chaque modification
- Validation : score numérique >= 0

#### `checkMatchCompletion(match)`
- **Localisation** : [script.js:~1900-1950](../script.js)
- **Règle** : Un joueur gagne le match en remportant 2 sets
- Calcul automatique du gagnant
- Marque le match comme complété
- Met à jour les classements

### Système de classement

#### `calculateRankings(day, division, sortBy = 'points')`
- **Localisation** : [script.js:~2500-2700](../script.js)
- **Modes de tri** :
  - `'points'` : Classement officiel tennis de table
  - `'winRate'` : Classement par pourcentage de victoires

**Critères de classement (mode 'points')** :
1. Total de points (3 par victoire, 0 par défaite)
2. Différence de sets (won - lost)
3. Différence de points (won - lost)
4. Nombre de victoires
5. Ordre alphabétique (départage final)

#### `calculateGeneralRanking(sortBy = 'points')`
- **Localisation** : [script.js:~2700-2900](../script.js)
- Agrège les données de TOUTES les journées
- Cumule : matchs, victoires, sets, points
- Applique les mêmes critères de tri que `calculateRankings()`

### Système de poules

#### `initializePoolSystem(day, division)`
- **Localisation** : [script.js:~3500-3600](../script.js)
- Active le mode poules pour une division
- Configuration : taille des poules (4/5/6) et nombre de qualifiés (2/3)

#### `generatePools(day, division)`
- **Localisation** : [script.js:~3600-3800](../script.js)
- **Algorithme de répartition équilibrée** :
  1. Mélange aléatoire des joueurs
  2. Distribution serpentine (1→2→3, 3→2→1, etc.)
  3. Création d'une poule par groupe

#### `generatePoolMatches(day, division, poolIndex)`
- **Localisation** : [script.js:~3800-3900](../script.js)
- Génère tous les matchs d'une poule (round-robin complet)
- Chaque joueur affronte tous les autres de sa poule

#### `generateManualFinalPhase(day, division)`
- **Localisation** : [script.js:~4200-4400](../script.js)
- Sélection manuelle des joueurs pour la phase finale
- Formats supportés :
  - 4 joueurs : Demi-finales + Finale + Petite finale
  - 8 joueurs : Quarts + Demis + Finale + Petite finale

### Export et impression

#### `exportChampionship()`
- **Localisation** : [script.js:~5200-5250](../script.js)
- Sérialise l'objet `championship` en JSON
- Téléchargement via blob + URL temporaire
- Nom du fichier : `championnat_YYYY-MM-DD.json`

#### `processImport(file)`
- **Localisation** : [script.js:~5250-5350](../script.js)
- Lecture du fichier JSON importé
- Validation de la structure
- Écrase les données actuelles après confirmation

#### `exportGeneralRankingToPDF()`
- **Localisation** : [script.js:~5500-5800](../script.js)
- **Méthode** : Génération d'une page HTML complète stylisée
- Ouverture dans nouvelle fenêtre
- Impression via `window.print()` (conversion PDF par le navigateur)
- **Contenu** :
  - En-tête avec titre et date
  - Podium avec médailles (top 3)
  - Tableau de classement complet
  - Statistiques récapitulatives
  - Design avec gradients et couleurs par division

#### `printMatchSheets(day, division)`
- **Localisation** : [script.js:~5800-6000](../script.js)
- Génère des feuilles de match pour arbitres
- Format compact : 2 matchs par page A4
- Cases vides pour saisie manuelle des scores
- Organisé par tour

### Sauvegarde et chargement

#### `saveChampionship()`
- **Localisation** : [script.js:~6200-6250](../script.js)
- Sérialise `championship` en JSON
- Stockage dans `localStorage.championshipData`
- **Appelé automatiquement** après chaque modification

#### `loadChampionship()`
- **Localisation** : [script.js:~6250-6300](../script.js)
- Chargement depuis localStorage au démarrage
- Si absent, initialise un championnat vide avec Journée 1
- Parse JSON avec gestion d'erreur

### Gestion des journées

#### `addDay()`
- **Localisation** : [script.js:~700-750](../script.js)
- Crée une nouvelle journée vide
- Incrémente le numéro (séquentiel)
- Initialise players, matches, et pools vides

#### `removeDay(dayNumber)`
- **Localisation** : [script.js:~750-800](../script.js)
- **Protection** : Impossible de supprimer la Journée 1 (Hub Central)
- Confirmation obligatoire
- Supprime toutes les données de la journée

## Interface utilisateur

### Navigation par onglets

Structure principale :
```
- Journées (tabs dynamiques)
  ├── Journée 1 (Hub Central)
  ├── Journée 2
  └── Journée N

- Classement Général
```

Chaque journée contient :
```
- Gérer les Joueurs
  ├── Division 1
  ├── Division 2
  └── Division 3

- Matchs de la Journée
  ├── Division 1
  ├── Division 2
  └── Division 3

- Classement de la Journée
  ├── Division 1
  ├── Division 2
  └── Division 3
```

### Fonctions d'affichage

#### `updatePlayersDisplay(day, division)`
- Rafraîchit la liste des joueurs
- Affiche les boutons d'action (éditer, supprimer)
- État vide avec message d'aide

#### `updateMatchesDisplay(day, division)`
- Affiche les matchs par tour (1 à 4)
- Cartes de match avec formulaires de score
- Indicateur de progression (X/Y matchs complétés)
- Auto-repli des matchs terminés

#### `updateRankingsDisplay(day, division)`
- Tableau de classement stylisé
- Médailles pour le podium
- Statistiques détaillées par joueur
- Boutons de tri (Points / Taux de victoire)

## PWA (Progressive Web App)

### Service Worker ([sw.js](../sw.js))

```javascript
const CACHE_NAME = 'tennis-table-v1'
const urlsToCache = [
    '/tennisdetable/',
    '/tennisdetable/index.html',
    '/tennisdetable/styles.css',
    '/tennisdetable/script.js',
    '/tennisdetable/manifest.json'
]
```

**Stratégie** : Cache-first
- `install` : Mise en cache des ressources
- `activate` : Nettoyage des anciens caches
- `fetch` : Retour du cache si disponible, sinon réseau

### Installation

#### `setupInstallPrompt()`
- **Localisation** : [script.js:~6400-6500](../script.js)
- Écoute l'événement `beforeinstallprompt`
- Affiche une modal d'installation personnalisée
- Bénéfices listés : hors-ligne, rapide, accès facile

### Manifest ([manifest.json](../manifest.json))

```json
{
  "name": "Championnat Tennis de Table",
  "short_name": "Tennis Table",
  "start_url": "./index.html",
  "display": "standalone",
  "theme_color": "#2c3e50",
  "background_color": "#ffffff",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Note** : Les fichiers PNG des icônes doivent être générés (voir [icons/README.md](../icons/README.md))

## Conventions de code

### Nommage
- **Variables** : camelCase (`currentDay`, `matchesCompleted`)
- **Fonctions** : camelCase avec verbes (`addPlayer`, `generateMatches`)
- **Constantes** : Pas de convention stricte (mélange de styles)
- **Classes CSS** : kebab-case (`.match-card`, `.player-list`)

### Commentaires
- En français
- Commentaires de section avec séparateurs :
  ```javascript
  // ====== GÉNÉRATION DE MATCHS ======
  ```
- Explications au-dessus des blocs complexes

### Organisation du code

Le fichier [script.js](../script.js) est organisé en sections :
1. Variables globales et initialisation (lignes 1-100)
2. Gestion du championnat (100-700)
3. Gestion des joueurs (700-1200)
4. Génération de matchs (1200-2500)
5. Calcul des classements (2500-3500)
6. Système de poules (3500-4500)
7. Export et import (4500-5500)
8. Génération PDF (5500-6000)
9. Interface utilisateur (6000-6400)
10. PWA et initialisation (6400-6566)

## Points d'attention et limitations

### 1. Icônes PWA manquantes
- **Problème** : Seul le template SVG existe
- **Solution** : Générer icon-192.png et icon-512.png
- **Impact** : PWA fonctionnel mais sans icône personnalisée

### 2. Bibliothèque XLSX non chargée
- **Problème** : Import Excel mentionné mais bibliothèque absente
- **Workaround** : Utiliser import CSV/texte
- **Fichiers concernés** : [script.js:~600](../script.js) (fonction `bulkAddPlayers`)

### 3. Pas de package.json
- **Problème** : Dépendances dans node_modules mais pas de fichier de config npm
- **Impact** : Difficile de régénérer node_modules ou gérer versions
- **Recommandation** : Créer package.json avec liste des dépendances

### 4. Performance avec grand nombre de joueurs
- **Algorithme O(n²)** pour génération de matchs
- Tests recommandés : >50 joueurs par division
- Possibilité d'optimisation avec indexation

### 5. LocalStorage limité
- **Limite** : ~5-10 MB selon navigateur
- **Risque** : Perte de données si quota dépassé
- **Recommandation** : Export JSON régulier comme backup

### 6. Pas de validation serveur
- Tout en client-side
- Pas de synchronisation multi-utilisateurs
- Export/Import manuel pour partage

## Guide pour modifications futures

### Ajouter une nouvelle division

1. Modifier l'initialisation dans `initializeDay()` :
```javascript
days[dayNumber] = {
    players: { 1: [], 2: [], 3: [], 4: [] },  // Ajouter division 4
    matches: { 1: [], 2: [], 3: [], 4: [] },
    pools: { ... }
}
```

2. Mettre à jour les boucles d'affichage :
```javascript
for (let div = 1; div <= 4; div++) {  // Changer 3 en 4
    // ...
}
```

3. Ajouter onglet dans l'interface HTML

### Modifier les règles de classement

Fonction à modifier : `calculateRankings()` ligne ~2500

Exemple : Ajouter bonus pour set parfait (3-0) :
```javascript
stats.totalPoints = stats.matchesWon * 3
// Ajouter bonus
if (match.sets[0].winner === playerName &&
    match.sets[1].winner === playerName &&
    match.sets[2].winner === playerName) {
    stats.totalPoints += 1  // Bonus 3-0
}
```

### Changer le nombre de tours

Variable : `tour` (actuellement 1-4)

1. Modifier la boucle dans `generateMatchesForDay()` :
```javascript
for (let tour = 1; tour <= 5; tour++) {  // 5 tours au lieu de 4
    // ...
}
```

2. Vérifier affichage par tour dans UI

### Ajouter export Excel

1. Charger bibliothèque SheetJS :
```html
<script src="https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js"></script>
```

2. Créer fonction d'export :
```javascript
function exportToExcel() {
    const data = calculateGeneralRanking()
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Classement")
    XLSX.writeFile(wb, "classement.xlsx")
}
```

### Implémenter synchronisation en ligne

Recommandations :
1. Backend : Firebase Realtime Database ou Supabase
2. Authentification : Codes de championnat uniques
3. Structure : un document par championnat
4. Conflit : Last-write-wins ou versioning

## Debugging

### Console logs utiles

Le code contient plusieurs `console.log()` :
- Génération de matchs : état des tours
- Sauvegarde : confirmation de stockage
- Import : données chargées

### Outils navigateur recommandés

1. **Application > Local Storage** : Inspecter `championshipData`
2. **Network** : Vérifier chargement des bibliothèques
3. **Console** : Erreurs de parsing JSON
4. **Application > Service Workers** : État PWA

### Réinitialisation complète

```javascript
// Dans la console navigateur
localStorage.clear()
location.reload()
```

## Tests recommandés

### Tests fonctionnels manuels

1. **Ajout joueurs**
   - [ ] Ajout individuel
   - [ ] Import CSV
   - [ ] Copier-coller multiple
   - [ ] Gestion doublons

2. **Génération matchs**
   - [ ] 4 joueurs (2 matchs par tour)
   - [ ] 10 joueurs (5 matchs par tour)
   - [ ] Nombre impair (gestion du joueur sans adversaire)
   - [ ] Vérifier aucun doublon dans un même tour

3. **Scoring**
   - [ ] Match 2-0
   - [ ] Match 2-1
   - [ ] Validation score négatif
   - [ ] Keyboard navigation (TAB/ENTER)

4. **Classements**
   - [ ] Tri par points correct
   - [ ] Départage par sets
   - [ ] Classement général multi-journées

5. **Export/Import**
   - [ ] Export JSON
   - [ ] Réimport du fichier exporté
   - [ ] Export PDF (affichage, impression)

6. **PWA**
   - [ ] Installation
   - [ ] Fonctionnement hors-ligne
   - [ ] Mise à jour du cache

## Ressources

- **Dépôt GitHub** : https://github.com/Romaincapp/tennisdetable
- **Documentation jsPDF** : https://github.com/parallax/jsPDF
- **Documentation PWA** : https://web.dev/progressive-web-apps/
- **Règles tennis de table** : https://www.fftt.com/

## Conclusion

Cette application est un projet complet et fonctionnel pour la gestion de championnats de tennis de table. L'architecture en Vanilla JavaScript permet une grande flexibilité et des performances correctes pour des championnats de taille moyenne (< 100 joueurs par division).

Les points d'amélioration principaux sont :
- Ajout de tests automatisés
- Génération des icônes PWA
- Création d'un package.json
- Optimisation pour très grands tournois
- Backend optionnel pour synchronisation

Le code est bien structuré, commenté en français, et facilement extensible pour de nouvelles fonctionnalités.
