# Compte rendu de session — 15 septembre 2026

## Objectif

Faire un état des lieux du prototype Resto Plus / PalaceOS par rapport au document de
cadrage, puis traiter en priorité les trois failles de sécurité/hygiène technique les
plus bloquantes avant toute suite : l'authentification désactivable par défaut,
l'absence de policies RLS Supabase, et la pollution du dépôt git par `node_modules`.

## État des lieux par rapport au cadrage

Comparaison du document de cadrage (« Digital Luxury », Espace Opérationnel + Espace
Académie, 4 services, roadmap en 3 phases) avec le code réel :

- **Espace Opérationnel** (Phase 1, Restauration) : couvert de façon substantielle —
  plan de salle, checklists, réservations/clients, gestion d'équipe et d'accès.
- **Espace Académie** (recettes, allergènes pédagogiques, guides HACCP, certification) :
  absent à 100 %, aucun écran ni route dédiés.
- **Offline-first** et **bascule Dark/Light automatique** (piliers explicites de la
  Phase 1) : `packages/sync-engine` embryonnaire, pas de bascule de thème trouvée.
- **RBAC/RGPD** (Phase 2) : hiérarchie de rôles N0–N4 bien conçue, mais aucune policy
  RLS en base, aucune purge RGPD automatique.
- **Qualité générale** : zéro test dans tout le repo, plusieurs fonctionnalités clés
  (plan de salle, module plateforme) encore stockées en mémoire côté serveur (perdues
  au redémarrage), `README` désynchronisé de l'état réel du code.

Conclusion : prototype solide sur le volet opérationnel restauration, mais très en
retard sur les fondations transverses (offline, thème, tests) et silencieux sur
l'Académie. Voir aussi la section *Points encore en prototype* ci-dessous.

## Avancées de la journée

- Correction du bypass d'authentification activé par défaut.
- Écriture d'une première migration de policies RLS Supabase.
- Correction du choix de clé Supabase utilisée par le backend (anon → service_role).
- Nettoyage de `node_modules` du suivi git (30 309 fichiers désindexés).
- Nouvelle fonctionnalité : gestion des stocks cuisine (catalogue, mouvements
  historisés, alertes de seuil).
- Séparation effective des espaces équipe par pôle métier (salle / cuisine /
  direction), contrôlée à la création de l'accès par le N3 de l'établissement.
- Lien commande ↔ ingrédients : commander un plat décrémente automatiquement le
  stock et alerte la cuisine en cas de passage sous le seuil.
- Prémices de l'équation prix/marge (coût d'achat par ingrédient, prix de vente par
  plat) et intégration du premier menu réel (9 recettes) comme données d'exemple.
- 7 comptes de démonstration (un par niveau d'accès, par pôle) et testés en Expo Go.

## Fonctionnalités réalisées

### Authentification — fail-closed en production

- `REQUIRE_AUTH` ne détermine plus seul si l'auth est exigée : en production
  (`NODE_ENV=production`), elle est désormais exigée par défaut, même si la variable
  n'est pas définie.
- `REQUIRE_AUTH=false` explicite en production fait échouer le démarrage de l'API au
  lieu de démarrer silencieusement sans protection.
- Hors production (dev local, tests Expo Go sans Supabase configuré), le comportement
  précédent est conservé : l'auth reste optionnelle par défaut pour ne pas bloquer les
  tests en mode mock. Il faut poser `REQUIRE_AUTH=true` explicitement pour l'exiger
  localement.
- Un log d'avertissement s'affiche désormais au démarrage de l'API quand l'auth est
  désactivée, pour que le mode permissif ne passe plus inaperçu.

### Row Level Security — première migration

- Nouvelle migration `0006_row_level_security.sql` : activation de la RLS et policies
  d'isolation par `restaurant_id` sur `salles`, `tables_salle`, `reservations`,
  `clients`, `service_events`, `restaurant_members`, `restaurant_invitations`.
- Ajout de la colonne `restaurant_id` manquante sur `checklist_entries` (nécessaire
  pour la scoper), les tables `checklists`/`checklist_items` restant des gabarits
  partagés en lecture seule pour tout utilisateur authentifié.
- Policies dédiées sur `users` : lecture de sa propre fiche, lecture des coéquipiers du
  même restaurant, modification de sa propre fiche uniquement.
- Fonctions utilitaires `is_restaurant_member` / `is_restaurant_admin` en
  `security definer` pour éviter la récursion des policies sur `restaurant_members`.
- Correction associée dans `supabase.ts` : le backend doit désormais utiliser
  `SUPABASE_SERVICE_ROLE_KEY` (et non la clé anon) pour ses requêtes internes (ex:
  lookup de membership dans `auth.ts`), sans quoi la RLS aurait bloqué silencieusement
  ses propres requêtes dès sa mise en route. Un avertissement s'affiche si seule la clé
  anon est configurée. `.env.example` mis à jour en conséquence.
- Cette migration ne s'applique qu'à un vrai projet Supabase : le backend tournant
  encore entièrement en mock (données en mémoire), aucun test local existant n'est
  affecté par ce changement.

### Hygiène du dépôt git

- 30 309 fichiers sous `resto-plus/node_modules/` étaient trackés dans git malgré le
  `.gitignore`, avec des blobs dupliqués et désynchronisés des sources réelles (ex:
  `backend/api/src/main.ts` existait aussi sous
  `node_modules/@resto-plus/api/src/main.ts`), ce qui faisait apparaître les mêmes
  fichiers modifiés en double dans `git status`.
- Désindexation effectuée (`git rm -r --cached`) et commitée séparément
  (`dd956603 — chore: untrack resto-plus/node_modules from git`) ; les fichiers restent
  présents sur le disque, seul le suivi git est nettoyé.

### Gestion des stocks cuisine

- Nouveau type `StockItem` (quantité, unité, seuil d'alerte, coût d'achat) et
  `StockMovement` (réception, sortie, perte, ajustement), avec historique par
  article. Nouvelle route `backend/api/src/routes/stock.ts` (mock en mémoire, comme
  le reste de l'API) et écrans mobiles `StockScreen`/`StockItemDetailScreen`.
- Migration `0007_stock.sql` : tables `stock_items`/`stock_movements`, RLS par
  restaurant réutilisant les fonctions posées en `0006`.
- Ajustement du stock réservé à N1+ (chef de partie/chef de cuisine et au-dessus) ;
  N0 consulte en lecture seule. Contrôle appliqué côté API, pas seulement côté mobile.

### Séparation salle / cuisine par pôle

- Nouveau type `Pole` (`salle` | `cuisine` | `direction`) sur `RestaurantMember` et
  `RestaurantInvitation`. Un cuisinier n'a plus accès au plan de salle, aux
  réservations ni aux tâches de salle ; un serveur n'a plus accès aux checklists
  HACCP, au suivi des plats ni à la gestion des stocks — masqué à l'accueil et
  re-vérifié au niveau de chaque écran (défense en profondeur).
- Le cadre (les pôles existants) relève du niveau N4 (`DevCreatorPanelScreen`,
  lecture seule) ; l'affectation concrète de chaque équipier à un pôle est une
  prérogative du N3 de l'établissement, depuis `GestionAccesScreen` ou dès la
  génération d'une invitation QR (`InviterEquipierScreen`).
- Migration `0008_pole_menu_marge.sql` : colonne `pole` sur `restaurant_members`
  (rétro-remplie : direction pour N2/N3, salle sinon) et `restaurant_invitations`.

### Lien commande → stock → alerte

- Nouveau type `MenuItem` (plat ↔ liste d'ingrédients de stock). Route
  `POST /menu-items/:id/order` : décrémente chaque ingrédient lié en une seule
  opération, avec validation préalable de la disponibilité de tous les ingrédients
  avant toute écriture (pas de stock à moitié décrémenté si un ingrédient manque).
- Alerte de seuil générée uniquement au moment où l'on *franchit* le seuil (pas à
  chaque mouvement tant qu'on reste bas), pour ne pas noyer le chef de cuisine sous
  des doublons. Testé en direct : commander un plat fait passer un ingrédient sous
  son seuil et déclenche l'alerte, visible dans `StockScreen`.
- Écran table (`ClientEditionScreen`) : section « Commander un plat » reliée à la
  carte, qui déclenche la décrémentation et remonte une erreur claire en cas de
  stock insuffisant, sans jamais laisser un plat « à moitié commandé ».
- Migration `0008_pole_menu_marge.sql` couvre aussi `menu_items`/
  `menu_item_ingredients` et `stock_alerts` (persistance de l'alerte, avec RLS).

### Base de l'équation prix/marge

- `StockItem.prixAchat` (coût d'achat unitaire) et `MenuItem.prixVente` posent la
  base du calcul de marge par plat (`menuStore.margeUnitaire()`), dès que le coût de
  chaque ingrédient lié est renseigné. Pas encore affiché dans l'UI : c'est la
  fondation demandée, pas un tableau de bord.
- Le premier menu réel (9 recettes : 3 entrées, 3 plats, 3 desserts, prix de vente et
  coûts d'achat fournis) a remplacé les plats d'exemple inventés — une trentaine
  d'articles de stock désormais nommés d'après de vrais ingrédients. Les lignes qui
  regroupent plusieurs éléments sous un seul prix (« beurre & assaisonnement »,
  « vinaigrette & persil »...) sont approximées en un seul article de stock plutôt
  que décomposées finement.

### Comptes de démonstration et test Expo Go

- 7 comptes de démo (`comptesalle-0` à `3`, `comptecuisin-0` à `2`, mot de passe
  unique `resto2026`), un par niveau d'accès dans chaque pôle — le directeur (N3) est
  unique et partagé (pôle direction, voit les deux espaces), d'où 7 et non 8 comptes.
  Vérifiés localement dans `apps/mobile/src/data/demoAccounts.ts`, choisis à l'écran
  de connexion (`LoginScreen`) plutôt que par variable d'environnement.
- Document dédié `docs/comptes-demo.md` : identifiants, ce que chaque compte doit
  voir, et un mini plan de test (séparation des pôles, droits d'ajustement stock par
  niveau, décrémentation à la commande).
- Testé en conditions réelles : API (`backend/api`) et Metro (`expo start --lan`)
  lancés en local, connexion depuis un téléphone via Expo Go sur le même réseau —
  confirmé fonctionnel par l'utilisateur.

## Points encore en prototype

- Aucun test automatisé n'existe dans le dépôt.
- Le plan de salle et le module plateforme (`platform.ts`) restent stockés en mémoire
  côté serveur, sans persistance réelle.
- Toutes les routes API (`salles`, `checklists`, `clients`, `invitations`, `stock`,
  `menu`...) servent encore des données mockées en mémoire, non branchées sur les
  tables Postgres/Supabase réelles — les migrations SQL et la RLS posent le socle,
  mais rien ne les utilise encore côté API.
- L'Espace Académie (recettes, allergènes pédagogiques, guides HACCP, certification)
  n'a aucune implémentation, ni backend ni mobile.
- L'offline-first et la bascule Dark/Light automatique, pourtant piliers de la Phase 1
  du cadrage, restent à construire.
- `DevCreatorPanelScreen.tsx` (console de création d'univers restaurant, rôle N4)
  s'appuie côté mobile sur `EXPO_PUBLIC_PLATFORM_ROLE`, une variable d'environnement
  trivialement falsifiable côté client. Tant que ce rôle n'est pas fourni par une vraie
  session Supabase, cet écran doit rester strictement hors build de production.
- Les 7 comptes de démo (`docs/comptes-demo.md`) ne sont pas une authentification :
  ce sont des identifiants vérifiés localement dans l'app mobile, à retirer avant
  toute mise en production, une fois Supabase Auth réellement branché.
- La carte (`MenuItem`) et le lien vers les ingrédients de stock sont saisis en dur
  dans le code (mock), sans écran de gestion de la carte côté cuisine/direction.
- L'équation prix/marge n'a encore aucune restitution visuelle (pas de marge
  affichée à l'écran) : la donnée existe et se calcule, mais rien ne l'exploite
  encore côté UI.
- Le `README` reste désynchronisé de l'état réel d'avancement du code.

## Vérifications

- `tsc --noEmit` exécuté sur `backend/api` : aucune erreur introduite par les
  changements du jour (`auth.ts`, `supabase.ts`, `main.ts` compilent proprement ; les
  seules erreurs restantes, dans `routes/tables.ts`, sont préexistantes et sans rapport
  avec cette session).
- Vérification que `node_modules` reste bien exclu par les deux `.gitignore` (racine et
  `resto-plus/`) après désindexation, pour éviter tout retracking accidentel.
- Fichiers physiquement conservés sur le disque après le `git rm --cached` (rien n'a été
  supprimé, seul l'index git a changé).
- `tsc --noEmit` exécuté sur `backend/api` et `apps/mobile` après l'ajout des stocks,
  du pôle métier, de la carte et des comptes de démo : aucune nouvelle erreur (mêmes
  deux erreurs préexistantes, sans rapport, dans `routes/tables.ts`).
- Routes `stock.ts`/`menu.ts` testées en direct (API démarrée en local) : création
  d'article, mouvement de stock, historique, commande d'un plat multi-ingrédients,
  franchissement de seuil déclenchant une alerte, refus propre en cas de stock
  insuffisant sans décrémentation partielle.
- Test bout en bout en Expo Go : API + Metro lancés en local (réseau LAN), connexion
  depuis un téléphone, parcours des 7 comptes de démo — **confirmé fonctionnel par
  l'utilisateur**.

## Prochaine étape recommandée

1. Sécuriser `DevCreatorPanelScreen.tsx` : faire porter le rôle `dev_creator` par la
   session Supabase réelle plutôt que par une variable d'environnement client.
2. Brancher les routes API sur les vraies tables Postgres/Supabase (elles servent
   encore uniquement des données en mémoire), pour que la RLS ajoutée aujourd'hui ait
   un effet réel — stock et carte inclus.
3. Remplacer les 7 comptes de démo par une vraie authentification Supabase, avec le
   pôle et le niveau d'accès portés par `restaurant_members` plutôt que choisis à
   l'écran de connexion.
4. Construire un écran de gestion de la carte (créer/modifier un plat et son lien
   vers les ingrédients) plutôt que la carte codée en dur.
5. Afficher la marge par plat dans l'UI (le calcul existe déjà côté `menuStore`) et
   commencer à accumuler l'historique commande/marge nécessaire à une future analyse
   de données de marché.
6. Démarrer l'Espace Académie (recettes, allergènes, guides HACCP) — actuellement à 0 %
   du cadrage.
7. Construire le socle offline-first et la bascule Dark/Light automatique, tous deux
   attendus dès la Phase 1.
8. Ajouter une première suite de tests (au minimum sur l'auth, l'isolation
   multi-restaurant et la décrémentation de stock à la commande).
