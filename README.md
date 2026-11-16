# Portfolio de Clément GAST

Un portfolio en forme de musée que l'on visite en 3D : une carte, des salles, des tableaux célèbres détournés, des objets à manipuler. Une version rapide, sans 3D, présente le même contenu pour les lecteurs pressés, les petits écrans et les lecteurs d'écran.

## Comment ce site est construit

Ce site est écrit avec un assistant de code IA (Claude Code), et c'est assumé : c'est aussi ce qu'il démontre.

- **Ce que je fais :** cadrer le besoin, choisir entre les options proposées, visiter le résultat, signaler ce qui ne va pas, décider de ce qui est publié.
- **Ce que fait l'assistant :** écrire le code, les tests et les contrôles, sous ces décisions.
- **Les garde-fous :** un cahier des charges et un plan écrits avant le code, des tests automatiques, un contrôle de vie privée à chaque construction, une relecture par un second agent, et un essai piloté (`scripts/smoke.js`) qui clique réellement sur les boutons du site.

Cet essai piloté vient d'une vraie panne : la galerie 3D plantait au démarrage et le site se repliait en silence sur la version rapide. Les tests ne le voyaient pas. Je l'ai remarqué en visitant le site ; l'essai a été ajouté pour que cela ne passe plus inaperçu.

## Lancer le site

Le projet utilise [Bun](https://bun.sh).

```bash
bun install
bun run dev      # site en local
bun test         # tests
bun run build    # construction dans dist/, fichiers pour les IA, contrôle de vie privée
```

## Organisation

| Dossier | Rôle |
|---|---|
| `content/site.json` | Tous les textes, en français et en anglais |
| `src/fast/` | Version rapide, pré-rendue dans la page |
| `src/map/` | Carte du musée et séquence d'ouverture |
| `src/gallery/` | Musée en 3D : marche, salles, objets, jardin |
| `src/paintings/` | Tableaux et leurs animations |
| `scripts/` | Fichiers pour les IA (`cv.json`, `llms.txt`) et contrôle de vie privée |
| `public/art/`, `public/tex/` | Œuvres et textures, voir les crédits ci-dessous |

## Crédits

### Œuvres

Les tableaux accrochés dans le musée sont des reproductions d'œuvres du domaine public, récupérées sur [Wikimedia Commons](https://commons.wikimedia.org). Les animations qui les détournent sont originales.

| Fichier | Œuvre | Artiste | Date |
|---|---|---|---|
| `astronomer.jpg` | L'Astronome | Johannes Vermeer | 1668 |
| `starry-night.jpg` | La Nuit étoilée | Vincent van Gogh | 1889 |
| `great-wave.jpg` | La Grande Vague de Kanagawa | Katsushika Hokusai | vers 1831 |
| `chess-game.jpg` | La Partie d'échecs | Sofonisba Anguissola | 1555 |
| `babel.jpg` | La Tour de Babel | Pieter Bruegel l'Ancien | 1563 |
| `venus.jpg` | La Naissance de Vénus | Sandro Botticelli | vers 1485 |
| `wanderer.jpg` | Le Voyageur contemplant une mer de nuages | Caspar David Friedrich | vers 1818 |
| `adam.jpg` | La Création d'Adam | Michel-Ange | vers 1511 |

### Textures

Les textures de sols et de murs viennent de [Poly Haven](https://polyhaven.com), sous licence CC0 : `white_plaster_02`, `granite_tile`, `herringbone_parquet`, `leafy_grass`, `dark_wooden_planks`, `wood_table_001`, `brown_leather`, `japanese_stone_wall`, `grey_roof_01`.

### Bibliothèques

[Three.js](https://threejs.org) pour la 3D, [GSAP](https://gsap.com) pour les animations de la carte, [Vite](https://vite.dev) pour la construction.

### Le reste

Le mobilier, les personnages, les décors et les animations sont dessinés en code pour ce projet. Le problème d'échecs est attribué à Paul Morphy.
