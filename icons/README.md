# Icônes pour la PWA

Ce dossier doit contenir les icônes de votre application PWA.

## Icônes requises

Vous devez créer deux fichiers PNG :
- `icon-192x192.png` - Icône de 192x192 pixels
- `icon-512x512.png` - Icône de 512x512 pixels

## Comment créer les icônes

### Option 1 : Convertir le SVG fourni

Un fichier SVG template (`icon-template.svg`) est fourni. Vous pouvez le convertir en PNG en utilisant :

**En ligne :**
- https://cloudconvert.com/svg-to-png
- https://www.adobe.com/express/feature/image/convert/svg-to-png

**Avec un outil en ligne de commande :**
```bash
# Avec Inkscape
inkscape icon-template.svg -w 192 -h 192 -o icon-192x192.png
inkscape icon-template.svg -w 512 -h 512 -o icon-512x512.png

# Avec ImageMagick
magick icon-template.svg -resize 192x192 icon-192x192.png
magick icon-template.svg -resize 512x512 icon-512x512.png
```

### Option 2 : Utiliser un générateur en ligne

Vous pouvez créer vos icônes avec ces outils gratuits :
- https://realfavicongenerator.net/
- https://www.favicon-generator.org/
- https://favicon.io/

### Option 3 : Créer vos propres icônes

Créez vos propres icônes avec un logiciel de design graphique :
- Figma (gratuit en ligne)
- Canva
- GIMP (gratuit)
- Photoshop

**Recommandations :**
- Utilisez un design simple et reconnaissable
- Évitez les détails trop fins
- Utilisez des couleurs contrastées
- Testez le rendu sur fond clair et foncé

## Test des icônes

Une fois les icônes créées, testez votre PWA sur :
- Chrome/Edge (bureau et mobile)
- Safari iOS
- Firefox Android

## Note importante

Sans ces icônes, la PWA fonctionnera toujours, mais l'installation ne sera pas optimale et l'apparence dans le menu d'applications sera basique.
