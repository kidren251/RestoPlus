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
| `comptesalle-2`  | N2     | Manager de salle               | Idem + gestion des accès, configurateur de salle, **compte rendu de service salle** |
| `comptesalle-3`  | N3     | Directeur d'établissement       | **Les deux pôles** + **Espace direction** (comptes rendus reçus, comptes de l'équipe) |

## Pôle cuisine

| id / login       | Niveau | Rôle             | Voit                                                          |
|-------------------|--------|-------------------|-----------------------------------------------------------------|
| `comptecuisin-0`  | N0     | Commis de cuisine  | Checklists HACCP, suivi des plats, stocks (consultation seule)  |
| `comptecuisin-1`  | N1     | Chef de partie      | Idem + entrées de stock (création d'article, réception)         |
| `comptecuisin-2`  | N2     | Chef de cuisine     | Idem + sorties de stock (sortie, perte, ajustement, retrait d'article) + **compte rendu cuisine** |

Il n'y a pas de `comptecuisin-3` : le directeur d'établissement (N3) est un rôle
unique par établissement, en pôle **direction** — il voit déjà les deux espaces via
`comptesalle-3`. Le détail de cette règle (pôle métier, qui contrôle quoi) est dans
`docs/architecture.md`.

## Ce que chaque pôle/niveau doit vérifier

- **Séparation salle/cuisine** : `comptecuisin-*` ne doit jamais voir "Plan de
  salle", "Réservations" ni "Tâches de salle" (accueil ni accès direct). Les
  comptes `comptesalle-0/1/2` ne doivent jamais voir "Checklists HACCP",
  "Gestion des stocks" ni "Suivi des plats".
- **Entrées N1, sorties N2** : `comptecuisin-0` (N0) voit le stock en lecture
  seule. `comptecuisin-1` (N1) peut créer un article et enregistrer une
  **réception** uniquement. Seul `comptecuisin-2` (N2) peut enregistrer une sortie,
  une perte, un ajustement ou retirer un article.
- **Sorties provisoires** : toute baisse de stock (commande d'un plat en salle,
  sortie ou perte manuelle) apparaît « en attente de validation » dans
  l'historique de l'article. Le stock affiché baisse tout de suite, mais le
  « stock validé » (comptable) ne bouge qu'à la validation du compte rendu cuisine.
- **Commande → décrémentation stock** : depuis `comptesalle-0/1`, ouvrir une table
  et commander un plat de la carte (ex. "Fondant au chocolat") doit décrémenter
  chaque ingrédient lié, visible ensuite dans l'historique de l'article côté
  `comptecuisin-*`.
- **Compte rendu de fin de journée** : `comptesalle-2` → Espace équipe de salle →
  "Compte rendu du service" ; `comptecuisin-2` → Espace cuisine → "Compte rendu du
  service". L'app le génère (plats commandés, chiffre d'affaires, couverts,
  additions / coût matière, pertes, sorties à vérifier). Le chef de cuisine peut
  **annuler** une sortie contestée (le stock est rétabli), ajoute ses observations
  et valide : les sorties sont confirmées et le compte rendu part à la direction.
- **Réception par la direction** : `comptesalle-3` → Espace direction → "Comptes
  rendus reçus" affiche les comptes rendus validés des deux pôles.
- **Comptes permanents** : `comptesalle-3` → Espace direction → "Comptes de
  l'équipe" → créer un compte (nom, pôle, N0-N2) → un code `RP-XXXX-XXXX` s'affiche.
  Sur un autre téléphone : écran de connexion → "Première connexion ? Activer mon
  compte" → saisir le code, choisir un identifiant et un mot de passe
  (8 caractères min.). Le compte se connecte ensuite normalement depuis l'écran de
  connexion. "Désactiver" bloque toute nouvelle connexion.
- **Changer de pôle un équipier** (Gestion des accès) : N3 uniquement.
- **Fiche d'un article en attente** : quand des sorties attendent le compte rendu,
  la fiche affiche trois lignes : stock validé, sorties en attente, **reste en
  frigo / réserve**. Si le retrait de l'article est impossible, le bouton est grisé
  et la raison s'affiche en rouge.
- **Journée de service** : elle bascule à **5h du matin** (heure de Paris), pas à
  minuit. Une commande passée à 1h appartient au service de la veille. Le compte
  rendu salle ne compte que les réservations et les additions de la journée de
  service en cours.
- **Clôture de journée** : la journée de service est clôturée quand `comptesalle-2`
  ET `comptecuisin-2` ont validé leur compte rendu. Après la première validation,
  l'écran indique « En attente du compte rendu cuisine/salle » ; après la seconde,
  « la journée est clôturée ». Toute commande passée ensuite part dans le compte
  rendu du service suivant, même avant 5h. La direction voit les comptes rendus
  groupés par journée, avec « Clôturée à 1h32 » ou « Non clôturée · cuisine manquante ».
- **Journal d'audit** : `comptesalle-3` → Espace direction → "Journal d'audit".
  Après quelques actions (commande, sortie de stock, compte rendu, création de
  compte, tentative d'un N0 sur une action interdite…), chaque action apparaît avec
  son auteur, sa date et son empreinte ; le bandeau vert « Journal intègre » confirme
  que rien n'a été modifié. Les connexions des comptes de démo (vérifiées dans
  l'app) n'y figurent pas ; celles des comptes activés, oui.
- **Délégation des tâches** : `comptesalle-3` → Espace direction → "Délégation des
  tâches" → confier les responsabilités du chef de cuisine à `comptecuisin-1`.
  Sur le téléphone de `comptecuisin-1`, revenir à l'accueil : un bandeau annonce la
  délégation, le compte rendu cuisine apparaît dans l'Espace cuisine et les sorties
  de stock sont possibles. Le compte rendu validé porte la mention « par
  délégation ». "Mettre fin" retire ces droits au retour sur l'accueil.
- **Messagerie** : les destinataires proposés viennent de l'annuaire du restaurant
  (comptes de démo + comptes créés et activés). Dans "Comptes de l'équipe", le N3
  ouvre ou coupe l'accès messagerie de chaque compte ; un compte coupé voit
  « Ton accès à la messagerie n'est pas activé ». Dans une conversation, la zone de
  saisie remonte au-dessus du clavier.
- **`comptesalle-3` (direction)** : seul compte à voir les deux espaces équipe et
  à accéder à "Gestion des accès" avec la capacité de générer une invitation pour
  n'importe quel pôle.
- **Niveau figé** : le badge N0-N3 en haut du plan de salle affiche le niveau du
  compte connecté et n'est pas cliquable. Aucun compte ne peut changer son propre
  niveau.
- **`comptesalle-0` (N0)** : consulte les tables et les fiches clients, commande et
  réclame des plats, coche ses tâches. Il ne peut ni déplacer ou modifier une table,
  ni changer l'étape du repas, ni éditer une fiche client, ni envoyer l'addition, ni
  créer ou annuler une réservation.
- **"Réinitialiser la journée"** (tâches de salle) : visible uniquement en N2 et N3.
- **`comptesalle-3` — verrou de service** : à l'ouverture du plan de salle, un
  bandeau « Service verrouillé » bloque toutes les actions de service (commander,
  réclamer, suivi du dîner, fiche client) et le plan est verrouillé (les tables ne
  bougent pas). Toucher le bandeau déverrouille le service ; il se reverrouille à
  chaque retour sur le plan.

Les mêmes droits sont vérifiés par l'API (matrice partagée
`packages/types/src/permissions.ts`) : une requête envoyée sans passer par l'app
est refusée avec `403 ACCESS_LEVEL_INSUFFICIENT`.

## Pour se connecter

Dans l'écran de connexion de l'app, entrer l'`id / login` du compte souhaité comme
identifiant, et `resto2026` comme mot de passe.

Le plan de salle, les réservations, les clients et les relevés HACCP sont enregistrés
dans la base Supabase de dev : ils **survivent** au redémarrage de l'API. Pour repartir
d'une démo propre : `yarn workspace @resto-plus/api db:seed`.

Les comptes créés par la direction, les comptes rendus, le stock, la carte, la
messagerie, les délégations et le journal d'audit sont encore en mémoire : **ils
disparaissent au redémarrage du serveur** (branchement Supabase en cours, voir
`docs/axes-de-progression.md`).
