# Site de documentation

## Lancement
Double-cliquer sur `start.bat`.

Le script installe automatiquement la dépendance Express si nécessaire puis lance :
`http://localhost:3000`

## Données
Les données sont dans le dossier `data/`. Elles peuvent être modifiées sans toucher au serveur.

- `name.json` : nom, id unique et famille
- `effet.json` : effets et durée
- `indesirable.json` : effets indésirables
- `badmelange.json` : mélanges à éviter
- `dos.json` : informations de dosage
- `goodmelange.json` : mélanges bénéfiques
- `prix.json` : prix

Le serveur assemble les données par `id`.

## Important
Le site est conçu comme une interface documentaire. Les informations de dosage et de mélanges doivent être vérifiées par une source médicale fiable avant publication.


## Filtres dynamiques
Les filtres ne sont pas écrits en dur dans l'interface. Le serveur lit les JSON et construit automatiquement les listes uniques pour :
- familles ;
- effets ;
- effets indésirables ;
- prix ;
- mélanges disponibles dans l'API.

Pour ajouter un nouveau terme, il suffit de l'ajouter dans le JSON concerné.


## Relations entre produits pour les mélanges

Les fichiers `badmelange.json` et `goodmelange.json` ne stockent pas les noms des produits.

Exemple de structure :

```json
[
  {
    "id": 1,
    "melanges_ids": [2, 3]
  }
]
```

- `id` = produit de base ;
- `melanges_ids` = IDs des produits liés ;
- `name.json` contient la correspondance `id -> name`.

Le serveur fait automatiquement la jointure entre ces fichiers. L'API renvoie ensuite les noms dans `mauvais_melanges` et `bons_melanges`, ce qui permet au site d'afficher directement les noms sans dupliquer les informations dans les JSON.


## Mode DEBUG

`start.bat` lance le serveur avec des logs détaillés dans la fenêtre CMD.

Les logs indiquent notamment :
- chaque requête HTTP ;
- le chemin exact de chaque fichier JSON lu ;
- si un fichier JSON est introuvable ;
- si un JSON contient une erreur de syntaxe ;
- le nombre d'entrées chargées ;
- les erreurs de jointure/assemblage ;
- le statut des API `/api/drogues` et `/api/filtres`.

Le navigateur affiche également dans la console l'erreur exacte renvoyée par l'API.


## Administration locale

Un deuxième site d'administration est inclus dans le même dossier.

Lancer `admin.bat` pour ouvrir l'interface d'administration sur :
`http://127.0.0.1:3001`

Le serveur d'administration écoute exclusivement sur `127.0.0.1`, donc il n'est pas exposé sur le réseau.

L'interface permet :
- d'ajouter une entrée ;
- de modifier une entrée existante ;
- de supprimer une entrée ;
- de remplir les informations de `name.json`, `effet.json`, `indesirable.json`, `dos.json`, `badmelange.json`, `goodmelange.json` et `prix.json` en une seule sauvegarde ;
- de choisir les produits liés aux mélanges par leur ID ; les noms sont affichés dans l'interface ;
- de choisir une famille parmi `familles.json`.

`start_all.bat` lance simultanément le site principal et l'administration.
