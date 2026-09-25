# Compte rendu de session — 25 septembre 2026

## Objectif

Relancer une session de test Expo Go à deux appareils, puis faire mûrir le prototype
sur trois axes : les **droits** (qui peut faire quoi, vérifié côté serveur), la
**responsabilité** (comptes rendus de fin de journée, validation du stock, délégation,
journal d'audit) et la **sécurité** (isolation stricte entre restaurants, RLS
Supabase durcie). En parallèle, poser les premiers éléments commerciaux (arguments
de vente, pistes de facturation).

## Avancées de la journée

- Session Expo Go à deux appareils (API + Metro en LAN, QR code généré).
- Œil pour afficher/masquer le mot de passe à la connexion et à l'activation.
- Niveau d'accès figé : le badge N0-N3 du plan de salle n'est plus cliquable ; chaque
  écran respecte le niveau réel du compte connecté.
- **Matrice des droits unique**, partagée par l'app et l'API, vérifiée sur chaque
  route qui modifie des données.
- Verrou de service pour le directeur (N3) : consultation seule par défaut, pour
  éviter qu'un clic depuis le bureau ne perturbe un service.
- **Comptes rendus de service** salle et cuisine, générés par l'app, validés par les
  N2 en fin de journée, transmis à la direction.
- **Stock provisoire** : toute baisse du stock ne devient comptable qu'après
  validation du compte rendu cuisine par le chef ; le N1 fait les entrées, seul le N2
  fait les sorties.
- **Journée de service** qui ne s'arrête pas à minuit (bascule à 5h, heure de Paris)
  et qui est **clôturée** par la validation des deux comptes rendus.
- **Comptes permanents** créés par le N3 et activés par l'employé avec un code à usage
  unique, distincts de l'accès intérimaire par QR.
- **Délégation des tâches** d'un N2 absent à un N1 de son pôle.
- Messagerie branchée sur l'annuaire du restaurant, accès réglé par le N3, saisie qui
  remonte au-dessus du clavier.
- **Journal d'audit infalsifiable** (chaîne d'empreintes, durées de conservation).
- **Revue de sécurité** : isolation entre restaurants dans l'API, RLS durcie, en-têtes
  de démo neutralisés dès que l'authentification est exigée, test d'isolation.
- Nouveau document `docs/arguments-de-vente.md` (arguments + pistes de facturation).

## Fonctionnalités réalisées

### Droits et niveaux d'accès

- `packages/types/src/permissions.ts` : source unique des droits (niveau minimum +
  pôles autorisés), fonction `can()`. L'app s'en sert pour masquer/verrouiller,
  l'API pour refuser (`requirePermission()`, `checkPermission()` →
  `403 ACCESS_LEVEL_INSUFFICIENT` avec le droit manquant).
- N0 : consulte, commande et réclame les plats, coche ses tâches. Suivi du dîner,
  fiche client, addition, réservations : N1+. Configuration de salle, gestion des
  accès : N2+. Invitations, comptes, délégations, audit, changement de pôle : N3.
- Console plateforme N4 : elle était accessible à tous les comptes (appui long sur
  « PALACEOS ») ; réservée au N3 côté app en attendant un vrai compte N4.
- Stock : `stock.entree` (N1 : créer un article, réception) / `stock.sortie` (N2 :
  sortie, perte, ajustement, retrait d'article). Le retrait est refusé (message rouge
  explicite) si des sorties sont en attente ou si l'article est utilisé dans un plat.
- Commande d'un plat : c'est désormais l'API (`POST /menu-items/:id/order`) qui
  décrémente le stock ; la salle n'a plus besoin du droit d'ajuster le stock.
- Moteur offline : une action refusée définitivement (403, 400, 404…) est retirée de
  la file au lieu d'y rester bloquée indéfiniment.

### Verrou de service du directeur

- À l'ouverture du plan de salle, bandeau « Service verrouillé » : commander,
  réclamer, suivi du dîner et fiche client masqués ; tables verrouillées. Le N3
  déverrouille d'un geste ; reverrouillage automatique à chaque retour sur le plan.
- Ce n'est pas un droit mais une sécurité anti-fausse manipulation : l'API accepte
  les actions du N3.

### Comptes rendus, stock provisoire et clôture de journée

- `CompteRenduScreen` : brouillon généré (plats commandés, chiffre d'affaires estimé,
  couverts, additions / coût matière, pertes, sorties à vérifier), observations du
  responsable, validation.
- Côté cuisine, le chef peut **annuler une sortie contestée** (le stock est rétabli) ;
  la validation confirme toutes les sorties en comptabilité.
- Fiche article en trois lignes : stock validé, sorties en attente, **reste en frigo /
  réserve** — pas de calcul mental en plein service.
- `packages/types/src/serviceDay.ts` : journée de service basculant à 5h (fuseau du
  restaurant). Correction au passage d'un calcul qui se faisait en UTC (décalage de 2h).
- `journeeStore.ts` : journée **clôturée** quand les comptes rendus salle ET cuisine
  sont validés ; ce qui suit compte pour le service suivant, même avant 5h. Une
  journée restée incomplète est signalée « non clôturée » à la direction.
- `ComptesRendusRecusScreen` (N3) : comptes rendus groupés par journée avec leur état
  de clôture. Les sorties d'un service précédent resté sans compte rendu sont incluses
  et signalées, pour qu'aucune ne reste orpheline.

### Comptes permanents, délégation, messagerie

- `ComptesEquipeScreen` (N3) : création d'un compte N0-N2 → code `RP-XXXX-XXXX`
  (usage unique, 7 jours, jamais stocké en clair) partageable depuis l'app ;
  désactivation ; nouveau code. Compteurs **utilisateurs actifs / en attente /
  intérimaires en cours** (base de la future facturation).
- `ActivationCompteScreen` : première connexion avec le code, choix de l'identifiant
  et du mot de passe (hachage scrypt, anti-force-brute sur les échecs uniquement).
- `DelegationsScreen` (N3) : délégation des tâches d'un N2 à un N1 du même pôle pour
  un service, 3, 7 ou 14 jours ; fin à l'heure de fin de service du dernier jour ;
  bandeau d'information chez le délégué ; comptes rendus marqués « par délégation ».
- Messagerie : destinataires issus de l'annuaire du restaurant (comptes de démo +
  comptes activés), accès messagerie réglé par le N3 compte par compte ; l'API ne fait
  plus confiance au niveau de la cible envoyé par l'app. Zone de saisie au-dessus du
  clavier (`useKeyboardHeight`, compatible affichage bord à bord Android).

### Journal d'audit

- `backend/api/src/audit.ts` : journal en ajout seul, une chaîne d'empreintes SHA-256
  par restaurant et par catégorie (comptabilité 10 ans, HACCP 5 ans, comptes et droits
  5 ans, sécurité 1 an — durées à faire valider par un juriste).
- Journalisés : stock, commandes, additions, comptes rendus, clôtures, relevés HACCP,
  comptes, messagerie (réglage d'accès), délégations, invitations, connexions et
  refus d'accès. Jamais : codes, mots de passe, données clients, contenu des messages.
- Purge légale qui préserve la vérifiabilité (ancre de chaîne).
- `JournalAuditScreen` (N3) : bandeau d'intégrité, filtres par catégorie.

### Sécurité et isolation entre restaurants

- `backend/api/src/tenant.ts` : `restaurantDe()`, `appartient()`, `duRestaurant()`.
  Les 12 routes par identifiant répondent 404 hors de son restaurant ; les listes sont
  filtrées ; le restaurant d'un objet créé vient de la session, jamais du corps de la
  requête. Deux trous supplémentaires fermés : écrasement d'un client d'un autre
  restaurant, plat relié au stock d'un autre restaurant.
- En-têtes de démo (`X-Demo-User-*`, `X-Demo-Restaurant-Id`) ignorés dès que
  `REQUIRE_AUTH=true`. Abaissements propres à la démo signalés par de gros encadrés
  dans `tenant.ts`, `demoIdentity.ts` et `routes/platform.ts`.
- Migration `0013_durcissement_rls.sql` : RLS sur toutes les tables, vue en
  `security_invoker`, plus aucune écriture directe, lecture directe limitée aux données
  opérationnelles ; données sensibles réservées à l'API.
- Règles de sécurité documentées dans `docs/architecture.md`.

### Migrations SQL ajoutées

`0010` comptes rendus, stock provisoire, comptes équipe · `0011` journée de service,
délégations, accès messagerie, vue des clôtures · `0012` journal d'audit (verrou
anti-modification, purge légale) · `0013` durcissement RLS. (`0009` messagerie,
préparée avant la session, est incluse dans le même lot.)

### Côté commercial

- `docs/arguments-de-vente.md` : n° 1 transition en douceur (appli + bonne connexion
  plutôt qu'un équipement lourd), n° 2 stock fiable validé par un responsable, partie
  **Facturation** (paliers d'utilisateurs actifs, pass journée intérimaires).
- Pistes d'exploitation légale des données : rapports d'activité pour chaque client,
  statistiques **anonymisées et agrégées** pour la prospection.

## Points encore en prototype

- Toutes les données de l'API restent en mémoire (perdues au redémarrage) : comptes
  créés, comptes rendus, délégations, journal d'audit compris. Les migrations 0010 à
  0013 sont prêtes mais rien ne les utilise encore.
- Les 7 comptes de démo sont vérifiés dans l'app, pas par l'API : leurs connexions
  n'apparaissent pas dans le journal d'audit.
- Les en-têtes de démo et la console N4 ouverte restent actifs tant que
  `REQUIRE_AUTH=false` : ne jamais exposer l'API publiquement dans ce mode.
- Pas de temps réel entre appareils : un changement n'apparaît chez les autres qu'au
  rechargement d'un écran (la messagerie interroge toutes les 4 à 8 secondes).
- La délégation s'applique au retour du délégué sur l'accueil, pas instantanément.
- L'heure de bascule (5h) est commune à tous les restaurants ; la base prévoit un
  réglage par établissement, pas encore l'écran.
- `GestionAccesScreen` (changer de pôle, révoquer) utilise encore des données de
  démonstration locales, non journalisées.
- Clavier dans la messagerie : vérifié à la compilation, pas encore sur un téléphone.

## Vérifications

- `tsc --noEmit` sur `apps/mobile` : aucune erreur. Sur `backend/api` : uniquement les
  deux erreurs préexistantes de `routes/tables.ts`.
- Bundle Android reconstruit par Metro sans erreur après chaque lot de changements.
- Tests d'API de bout en bout, relancés sur serveur neuf après chaque lot :
  droits par niveau et parcours de base (31 cas), délégation / messagerie / compte
  rendu du jour, clôture de journée, journal d'audit (présence des actions, aucune
  donnée sensible, intégrité), isolation entre restaurants (34 tentatives croisées) —
  tous au vert.
- Journal d'audit : falsification simulée (ligne modifiée, ligne supprimée) détectée ;
  chaîne toujours vérifiable après une purge simulée à 11 ans.
- API lancée en `REQUIRE_AUTH=true` : toutes les requêtes avec en-têtes de démo
  refusées (401).
- Journée de service : 23h40 et 1h55 rattachées au même service, 5h00 au suivant.
- Nouveau test permanent : `yarn workspace @resto-plus/api test:isolation`.

## Prochaine étape recommandée

1. Tester sur téléphone les nouveaux parcours (comptes rendus, délégation, activation
   de compte, journal d'audit, clavier de la messagerie) avec `docs/comptes-demo.md`.
2. Brancher l'API sur Supabase (Auth + tables des migrations 0001 à 0013), puis
   remplacer les comptes de démo par de vrais comptes.
3. Faire valider par un juriste / DPO les durées de conservation du journal d'audit et
   le périmètre des statistiques anonymisées.
4. Rapports d'activité mensuels pour la direction, à partir des comptes rendus.
5. Temps réel (Supabase Realtime) sur le plan de salle et le stock.
6. Écran de réglage de l'heure de fin de service par établissement.
7. Transformer les tests d'API de la session en suite automatisée complète (seul le
   test d'isolation est pour l'instant versionné).
