# Championnat Tennis de Table

Application web de gestion de championnats de tennis de table multi-journées avec système de classement complet.

## Fonctionnalités

### Gestion de Tournoi
- **Multi-journées** : Créez et gérez un nombre illimité de journées de championnat
- **3 Divisions** : Support des divisions 1, 2 et 3 avec gestion indépendante
- **Journée 1 en Hub Central** : Gestion centralisée des joueurs depuis la première journée

### Gestion des Joueurs
- Ajout individuel ou en masse (import Excel/CSV, copier-coller)
- Modification globale des noms (mise à jour automatique dans tous les matchs)
- Suppression avec analyse d'impact
- Historique et statistiques détaillées par joueur

### Génération de Matchs
- **Algorithme Round-Robin intelligent** : 4 tours par joueur
- Priorisation des nouveaux matchs (évite les doublons)
- Minimisation des rematches sur l'ensemble du championnat
- Gestion des matchs BYE (3 points + 2 sets automatiques)

### Système de Score
- Format en **3 sets gagnants** (best-of-3)
- Saisie rapide avec raccourcis clavier (TAB, ENTER)
- Validation en temps réel
- Cartes de match repliables automatiquement

### Système de Poules (Optionnel)
- Poules de qualification configurables (4, 5 ou 6 joueurs)
- Nombre de qualifiés paramétrable (2 ou 3 par poule)
- Génération automatique équilibrée
- Phase finale manuelle avec tableau (quarts, demis, finale, petite finale)

### Classements et Statistiques
- **Classement par journée** : Points ou taux de victoire
- **Classement général** : Agrégation de toutes les journées
- Statistiques complètes : matchs, victoires, défaites, sets, points, différences
- Podium et visualisation des résultats

### Export et Impression
- Export/Import du championnat en JSON
- Export du classement général en JSON, HTML ou **PDF stylisé**
- Impression des feuilles de match pour arbitres
- Mise en page optimisée pour l'impression

### Progressive Web App (PWA)
- Installation sur mobile et desktop
- Fonctionnement hors-ligne après premier chargement
- Sauvegarde automatique dans le navigateur
- Interface responsive et moderne

## Technologies

- **Frontend** : HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Bibliothèques** :
  - jsPDF 3.0.3 (génération PDF)
  - html2canvas 1.4.1 (conversion HTML vers canvas)
  - DOMPurify (sécurité)
- **PWA** : Service Worker, Web App Manifest
- **Stockage** : LocalStorage (sauvegarde automatique)

## Installation

### Option 1 : Utilisation directe
1. Clonez le dépôt :
```bash
git clone https://github.com/Romaincapp/tennisdetable.git
cd tennisdetable
```

2. Ouvrez `index.html` dans votre navigateur
   - Ou lancez un serveur local : `python -m http.server 8000`

### Option 2 : Installation PWA
1. Accédez à l'application via HTTPS
2. Cliquez sur le bouton "Installer l'application"
3. Utilisez-la comme une application native

## Guide d'utilisation rapide

### 1. Créer un championnat
- Allez dans "Gérer les Joueurs" (Journée 1)
- Ajoutez les joueurs (un par un, import CSV/Excel, ou copier-coller)
- Attribuez-les aux divisions (D1, D2, D3)

### 2. Générer les matchs
- Dans "Matchs de la Journée", sélectionnez la division
- Cliquez sur "Générer les Matchs"
- Le système crée 4 tours équilibrés automatiquement

### 3. Saisir les scores
- Remplissez les scores de chaque set (best-of-3)
- Utilisez TAB pour naviguer, ENTER pour valider
- Les matchs se marquent automatiquement comme terminés après 2 sets gagnés

### 4. Consulter les classements
- **Classement Journée** : Résultats de la journée en cours
- **Classement Général** : Cumul de toutes les journées

### 5. Exporter les résultats
- Export JSON pour sauvegarde/partage
- Export PDF pour impression du classement général
- Impression des feuilles de match

## Structure du projet

```
tennisdetable/
├── index.html           # Interface principale
├── script.js            # Logique applicative (6566 lignes)
├── styles.css           # Styles et design
├── manifest.json        # Configuration PWA
├── sw.js                # Service Worker
├── icons/               # Icônes PWA
│   ├── icon-template.svg
│   └── README.md        # Guide de génération des icônes
├── node_modules/        # Dépendances JavaScript
└── README.md            # Ce fichier
```

## Fonctionnalités avancées

### Système de classement
Le classement suit les règles officielles du tennis de table :
1. Total de points (3 par victoire, 0 par défaite)
2. Différence de sets
3. Différence de points
4. Nombre de victoires
5. Ordre alphabétique (départage)

### Génération intelligente de matchs
L'algorithme :
- Génère 4 tours par joueur
- Priorise les nouveaux adversaires
- Minimise les rematches sur l'ensemble du championnat
- Équilibre le nombre de matchs par tour
- Suit l'historique complet des confrontations

### Système de poules
Mode alternatif pour phase de qualification :
- Création automatique de poules équilibrées
- Classement intra-poule
- Qualification des meilleurs joueurs
- Phase finale manuelle avec tableau éliminatoire

## Contribution

Dépôt GitHub : [https://github.com/Romaincapp/tennisdetable](https://github.com/Romaincapp/tennisdetable)

Les contributions sont les bienvenues ! N'hésitez pas à :
- Signaler des bugs
- Proposer de nouvelles fonctionnalités
- Soumettre des pull requests

## Licence

Projet développé pour Esenca Sport.

## Notes de développement

- **Données persistées** : Toutes les modifications sont sauvegardées automatiquement dans le localStorage
- **Icônes PWA** : Les fichiers PNG doivent être générés à partir du template SVG (voir icons/README.md)
- **Support XLSX** : Prévu mais bibliothèque non chargée actuellement (utiliser CSV en attendant)

## Auteur

Développé avec passion pour faciliter la gestion des championnats de tennis de table.
