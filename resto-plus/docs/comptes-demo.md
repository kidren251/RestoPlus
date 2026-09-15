# Comptes de démonstration — tests Expo Go

Ce document ne sert qu'à ça : donner aux testeurs les identifiants des comptes de
démo, un par niveau d'accès (N0-N3), dans le pôle salle puis dans le pôle cuisine.
Aucune authentification réelle n'est branchée (prototype) — ces comptes sont
vérifiés localement dans l'app mobile (`src/data/demoAccounts.ts`) à l'écran de
connexion.

**Mot de passe unique pour les 7 comptes : `resto2026`**

## Pôle salle

| id / login      | Niveau | Rôle                          | Voit                                                              |
|------------------|--------|-------------------------------|--------------------------------------------------------------------|
| `comptesalle-0`  | N0     | Serveur                       | Plan de salle, réservations, tâches de salle                      |
| `comptesalle-1`  | N1     | Chef de rang                  | Idem + suivi du déroulement du dîner                               |
| `comptesalle-2`  | N2     | Manager de salle               | Idem + gestion des accès, configurateur de salle (pôle salle uniquement) |
| `comptesalle-3`  | N3     | Directeur d'établissement       | **Les deux pôles** (salle + cuisine) — accès complet, admin+       |

## Pôle cuisine

| id / login       | Niveau | Rôle             | Voit                                                          |
|-------------------|--------|-------------------|-----------------------------------------------------------------|
| `comptecuisin-0`  | N0     | Commis de cuisine  | Checklists HACCP, suivi des plats, stocks (consultation seule)  |
| `comptecuisin-1`  | N1     | Chef de partie      | Idem + ajustements de stock (réception, sortie, perte)          |
| `comptecuisin-2`  | N2     | Chef de cuisine     | Idem + création d'articles de stock                              |

Il n'y a pas de `comptecuisin-3` : le directeur d'établissement (N3) est un rôle
unique par établissement, en pôle **direction** — il voit déjà les deux espaces via
`comptesalle-3`. Le détail de cette règle (pôle métier, qui contrôle quoi) est dans
`docs/architecture.md`.

## Ce que chaque pôle/niveau doit vérifier

- **Séparation salle/cuisine** : `comptecuisin-*` ne doit jamais voir "Plan de
  salle", "Réservations" ni "Tâches de salle" (accueil ni accès direct). Les
  comptes `comptesalle-0/1/2` ne doivent jamais voir "Checklists HACCP",
  "Gestion des stocks" ni "Suivi des plats".
- **Ajustement de stock réservé à N1+** : `comptecuisin-0` (N0) doit voir la
  gestion des stocks en lecture seule (pas de bouton "Ajouter un article" ni de
  formulaire de mouvement) ; `comptecuisin-1` et `comptecuisin-2` doivent pouvoir
  enregistrer un mouvement.
- **Commande → décrémentation stock** : depuis `comptesalle-0/1` (ou
  `comptesalle-3`), ouvrir une table et commander un plat de la carte (ex.
  "Fondant au chocolat") doit décrémenter chaque ingrédient lié, visible ensuite
  dans l'historique de l'article côté `comptecuisin-*`.
- **`comptesalle-3` (direction)** : seul compte à voir les deux espaces équipe et
  à accéder à "Gestion des accès" avec la capacité de générer une invitation pour
  n'importe quel pôle.

## Pour se connecter

Dans l'écran de connexion de l'app, entrer l'`id / login` du compte souhaité comme
identifiant, et `resto2026` comme mot de passe.
