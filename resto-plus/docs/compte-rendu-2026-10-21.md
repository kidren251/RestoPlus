# Compte rendu de session — 21 octobre 2026

## Objectif

Faire le point sur le projet, puis lancer **P1 — rendre le système réel** : poser les
tests, créer la base Supabase, corriger le schéma, traiter le RGPD et brancher une
première partie de l'API sur la vraie base.

## Depuis la dernière session (10 et 11 octobre, non documentées jusqu'ici)

- **Découpage des gros fichiers** de l'app : `AppNavigator` (686 → 397 lignes), plan
  de salle (910 lignes → dossier `components/plan-de-salle/`), hook `usePermissions()`
  et composant `<RequirePermission>`.
- **Fondations hôtelières** (types seulement) : catalogue de départements, référentiel
  des lieux, types PMS, configuration d'établissement ; feuille de route
  `docs/axes-de-progression.md`.
- Décisions produit : cible restauration → hôtel de moyen standing ; départements
  activés par le N4 ; tickets créés de N1 à N3.

Ce travail était resté non commité : il l'a été en début de session.

## Avancées de la journée

- Analyse du projet : points forts, points faibles, état de P1.
- **Socle de tests** : 79 tests automatiques de l'API (+ 11 tests sur la vraie base).
- **Projet Supabase de dev créé** (Paris), connexion vérifiée.
- **16 migrations appliquées** sur la base (dont 3 nouvelles).
- **RGPD** : allergies limitées au repas, anonymisation, purges automatiques.
- **Faille de sécurité trouvée et corrigée** (purge de l'audit appelable par tous).
- **Plan de salle branché sur Supabase** : les données survivent au redémarrage.
- **Réservations et clients branchés**, avec l'installation des clients en un geste.
- **Droits du service réglables par établissement** depuis la console N4.
- **Checklists HACCP branchées** ; deux documents : tests sur téléphone et guide de
  mise en place pour le technicien.

## Réalisations

### Tests et qualité

- `backend/api/src/app.ts` : `buildApp()` construit l'API sans la démarrer, pour la
  tester sans serveur.
- Vitest : isolation entre restaurants (portage de l'ancien script), matrice des droits
  (niveau × pôle, refus journalisé, délégation), mode authentification exigée,
  allergies. Commande : `yarn workspace @resto-plus/api test`.
- Vérifié que les tests détectent une régression (droit volontairement abaissé →
  3 tests en échec).
- Les 2 erreurs TypeScript de `routes/tables.ts` sont corrigées.

### Base Supabase

- Projet `restau-plus.v1-dev`, région Paris ; RLS automatique activée ; intégration
  GitHub volontairement non branchée (le dossier attendu n'existe pas et elle
  modifierait la base à chaque fusion dans `main`).
- Clés dans `backend/api/.env` (ignoré par git, à protéger : la clé `service_role` et le
  mot de passe donnent un accès total).
- Script `db:migrate` (suivi des migrations appliquées, mode `--a-blanc`) et
  `db:seed` (données de démo, relançable).
- Les 13 migrations existantes passaient du premier coup sur une base vierge.

### Nouvelles migrations

- **0014** : profil utilisateur relié à Supabase Auth (fin des informations en double
  entre `users` et `restaurant_members`) ; départements en données, `pole` →
  `departement` ; clôture de journée générique.
- **0015** : RGPD (voir plus bas).
- **0016** : plan de salle (nom et zone des tables, décor, repas en cours).
- Récapitulatif complet : nouveau document `docs/migrations.md`.

### RGPD

- **Décision : les allergies ne sont gardées que le temps du repas**, jamais sur la
  fiche client. Le serveur coche « signalées par le client lui-même, pour ce repas »
  (consentement) ; effacement à l'addition et au plus tard en fin de journée de service.
  Un client fidèle redonne ses allergies à chaque visite — c'est aussi la bonne
  pratique de sécurité alimentaire.
- Anonymiser plutôt que supprimer : clients inactifs depuis 3 ans, messages après
  12 mois, anciens membres 12 mois après leur départ (durées réglables, à valider).
- Un employé qui a validé un compte rendu ne peut pas être supprimé (historique
  protégé) : il est désactivé puis anonymisé.
- Purge automatique chaque nuit (pg_cron), effacement des allergies toutes les heures.
- Le journal d'audit garde le nom de l'acteur pendant sa durée légale (exception
  assumée, à faire valider).
- Registre des traitements : `docs/rgpd.md`.

### Sécurité

- La fonction de purge du journal d'audit (depuis 0012) pouvait être lancée avec la
  clé publique de l'app. Impact limité (seuls des événements expirés sont purgés),
  mais corrigé : toutes les fonctions sensibles sont réservées à l'API.
- Contrôle de la base réelle : 29 tables, toutes sous RLS ; 11 tables sensibles
  fermées à tout accès direct.

### Plan de salle sur Supabase

- Couche `backend/api/src/repositories/` : une interface par domaine, une
  implémentation en mémoire (tests, démo hors ligne) et une Supabase (réel), choisie
  automatiquement selon le `.env`. Modèle à reproduire pour les autres domaines.
- Routes `salles` et `tables` branchées ; chaque requête filtre aussi par restaurant.
- Restaurant de démo avec un identifiant fixe, identique en mémoire et en base.
- App : charge la salle du restaurant (plus de `salle-1` en dur), affiche le nom de
  la table.
- `yarn dev:api` charge maintenant le `.env` : l'API de dev travaille sur Supabase.

### Réservations, clients et gestes du service

- Décisions : walk-in = réservation « sans résa » visible dans la liste du soir ;
  annulation = statut « annulée » (pas de suppression) ; allergies saisissables dès la
  réservation (case « signalées par le client ») ; installer et changer de table dès N0.
- Panneau de la table : **Installer des clients** (réservation prévue ici en tête, ou
  n'importe quelle réservation attendue — le client qui demande une autre table — ou
  « Sans réservation » avec le nombre de couverts) et **Changer de table** (le repas,
  les allergies et la réservation suivent). Fin de l'ouverture silencieuse d'une table
  au toucher.
- Formulaire de réservation : choix de la table parmi celles de la salle (ou « à
  l'arrivée »), allergies + consentement. Badge « SANS RÉSA », nom des tables.
- `ReservationsScreen` découpé (508 → 95 lignes) : `ReservationCard`, `ReservationForm`,
  store partagé `reservationsStore`.
- Base (`0017`) : heure locale convertie avec le fuseau du restaurant ; les trois
  gestes (installer, changer de table, addition) sont des fonctions SQL exécutées en
  une transaction ; le déroulé du dîner est enregistré (sans doublon si la file hors
  ligne renvoie deux fois).
- Identifiants générés par l'app en uuid (`expo-crypto`), pour fonctionner hors ligne.
- **Bug trouvé par les tests sur la vraie base** : une mise à jour du repas sans la
  réservation effaçait le lien table ↔ réservation (historique, changement de table et
  addition cassés). Corrigé : seuls les gestes du service posent ce lien.

### Droits réglables par le N4

- 7 droits du service réglables par établissement (installer, commander, suivre le
  dîner, addition, fiche client, réservations, tâches) ; les pôles et les droits
  sensibles restent fixes. Validation stricte, modification inscrite au journal d'audit.
- Console N4 : section « Droits du service par établissement » (N0 à N3, valeur par
  défaut marquée). L'app charge les réglages à la connexion ; l'API les applique.
- La console N4 est de nouveau accessible en mode démo sur la base de dev
  (`REQUIRE_AUTH=false`) ; réservée à un vrai compte N4 dès que l'auth est exigée.

### Checklists HACCP

- Décision : ordre de branchement revu — HACCP, puis **comptes + Supabase Auth**, puis
  délégations (en base, une délégation désigne de vrais comptes ; les brancher avant
  l'Auth aurait imposé un bricolage à refaire).
- Migration `0018` : plan HACCP propre à chaque établissement ; relevé avec l'heure du
  téléphone (fait hors ligne), journée de service, conformité, commentaire ; un relevé
  ne peut pas être modifié, même directement en base.
- L'app retrouve au démarrage les relevés du jour (avant : perdus à chaque relance) ;
  un relevé renvoyé deux fois par la file hors ligne n'est gardé qu'une fois.

### Documents

- `docs/tests-telephone.md` : tout ce qu'il reste à vérifier sur téléphone, par
  parcours, avec le compte à utiliser et le résultat attendu.
- `docs/guide-mise-en-place.md` : pour le technicien — questions à poser, 4 profils de
  restaurant (brasserie, traditionnel, gastronomique, petite équipe) avec leurs
  réglages de droits, ce qui se règle où, liste de contrôle avant livraison.

### Côté commercial

- Argument de vente n° 3 : « Le RGPD géré par l'outil », avec une rubrique
  **Astuces** (réponse à l'objection « mes habitués devront redonner leurs
  allergies »).
- Argument n° 4 : « L'outil s'adapte à votre organisation » (droits réglables, gestes
  du service en un toucher).

## Points encore en prototype

- En base : plan de salle, réservations, clients, HACCP. Stock, carte, messagerie,
  comptes rendus, comptes, délégations et audit restent en mémoire.
- HACCP : « décocher » un point n'efface que l'affichage local ; le relevé envoyé fait
  foi et revient à la relance. Le plan HACCP ne se modifie pas encore depuis l'app.
- Installer un client hors ligne ouvre la table sur le téléphone sans réservation (pas
  de rattachement automatique au retour du réseau).
- L'écran Réservations n'a plus de liste de démo intégrée : sans API joignable, il est vide.
- Connexion toujours par comptes de démo (pas encore de jeton Supabase) :
  `REQUIRE_AUTH=false` sur la base de dev.
- Type `Pole` encore utilisé dans le code (la base dit déjà `departement`).

## Vérifications

- 112 tests API en mémoire : au vert. 27 tests d'intégration sur la base de dev
  (`test:supabase`) : au vert (persistance après redémarrage, gestes du service,
  droits réglés par le N4, HACCP, isolation).
- Scénarios en base dans des transactions annulées : 0014 (8 contrôles), 0015
  (22 contrôles, dont les droits d'exécution de la clé publique).
- `tsc --noEmit` : aucune erreur sur l'app et sur l'API.
- Pas encore vérifié sur téléphone : installer des clients / changer de table, formulaire
  de réservation, console N4 (droits), case de consentement aux allergies, écrans à
  droits après le refactor.

## Git

Branches poussées et fusionnées dans `test` (jamais dans `main` sans feu vert) :
`refactor/decoupage-gros-fichiers`, `chore/socle-tests-api`, `feat/p1-supabase-schema`,
`feat/p1-branchement-salles`, `feat/p1-reservations-clients`, `feat/p1-haccp`.

## Prochaine étape recommandée

1. Tester sur téléphone le lot du jour, puis fusionner `test` dans `main`.
2. **Comptes de l'équipe + Supabase Auth** (connexion avec jeton), puis délégations.
3. Continuer le branchement : carte et commandes, messagerie, stock, comptes rendus, audit.
4. Remplacer le type `Pole` par les départements dans le code.
4. Supabase Auth (connexion avec jeton) et `REQUIRE_AUTH=true` par défaut.
5. Faire valider par un juriste les points listés dans `docs/rgpd.md`.
