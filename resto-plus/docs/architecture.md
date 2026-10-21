# Resto Plus / PalaceOS — Architecture technique

## Stack
- **Mobile** : React Native (Expo), Zustand, react-native-svg + gesture-handler + reanimated pour le plan de salle
- **Offline** : sync engine maison (voir `packages/sync-engine`), queue locale + résolution de conflit par timestamp
- **Backend** : Fastify + Supabase (Postgres, Auth, Storage, Realtime, RLS pour le RBAC)
- **Monorepo** : Turborepo, workspaces Yarn

## Structure

```
resto-plus/
├── apps/
│   ├── mobile/            App principale (Expo)
│   └── admin-dashboard/   Phase 3 - dashboard direction
├── packages/
│   ├── ui-luxury/         Design tokens "Digital Luxury" (validés en maquette)
│   ├── sync-engine/       Logique offline-first réutilisable
│   └── types/             Types partagés front/back
├── backend/
│   ├── api/               Fastify + Supabase
│   └── db/migrations/     Schéma SQL
└── docs/
```

## Design system
Les tokens dans `packages/ui-luxury/src/tokens.ts` reflètent les maquettes validées :
fond crème dominant, or en accent rare, sceau gravé, numérotation serif pour les listes,
typographie serif (`PT Serif`) pour les intitulés nobles, sans-serif pour le contenu fonctionnel.

## Plan de salle spatial
Contrairement à une grille de statuts classique, le plan de salle reproduit la disposition
réelle : chaque table a des coordonnées `(x, y, rotation, forme)` libres, plus des éléments
de décor (`mur`, `bar`, `entree`, `cuisine`) pour repère visuel. Voir `packages/types/src/index.ts`.

## Roadmap de référence
**L'ordre de marche à jour (P1 → P2 → P3 → pilote → hôtellerie) et les tâches à cocher
sont dans [`axes-de-progression.md`](./axes-de-progression.md).** Étapes historiques :
0. Setup technique (ce dépôt) ✅
1. MVP restreint (plan de salle + checklists HACCP + offline)
2. Test terrain sur un établissement pilote
3. Polish (fiches recettes, messagerie)
4. Matériel de présentation (démo, deck)
5. Démarchage investisseurs/décideurs

## Réservations et suivi du service

Les réservations sont rattachées à une fiche `clients`, puis à une session de service.
La réservation conserve ses métadonnées d'origine (heure, source, couverts, allergies,
notes et statut), tandis que la session conserve les événements horodatés du dîner
(`arrivee`, `installation`, `entree_servie`, `plat_servi`, `dessert_servi`, etc.).

Le plan de salle expose l'état courant de chaque table : étape (`entrée`, `plat`,
`dessert`) et état du plat (`à réclamer`, `servi`). Les rôles fonctionnels prévus sont :

- `manager_admin` : configuration du plan et supervision du service ;
- `chef_rang` : mise à jour du déroulement du dîner et des plats ;
- `serveur` : consultation et opérations de salle autorisées.

Dans le prototype, ces états sont synchronisés par la file offline et stockés en mémoire
côté API mock. La diffusion multi-appareils via Supabase Realtime reste l'étape suivante.

## Cloisonnement multi-restaurant

Le produit est multi-tenant : un restaurant est une frontière de données stricte.
Les utilisateurs sont reliés à un restaurant par `restaurant_members`, avec un niveau
`N0 serveur`, `N1 chef_rang`, `N2 manager_admin` ou `N3 directeur_admin`. Les salles, tables, clients, réservations et
événements de service portent un `restaurant_id`.

Le niveau `N4 dev_creator` est un rôle de plateforme séparé. Il n'est pas membre d'un
restaurant par défaut et sa console de création d'univers doit rester invisible aux
comptes restaurant. Toute action N4 devra être contrôlée côté API, jamais par un simple
geste caché dans l'application mobile.

En production, chaque requête est filtrée par le restaurant issu de la session
authentifiée. Les policies Supabase RLS (migration `0006_row_level_security.sql`)
empêchent toute lecture ou écriture hors de ce périmètre au niveau Postgres lui-même,
y compris si un utilisateur modifie directement un identifiant dans une requête — donc
même si le filtrage métier applicatif a un trou. Il ne faut pas utiliser le nom du
restaurant ou un paramètre mobile comme preuve d'appartenance.

Important : le backend doit interroger Supabase avec `SUPABASE_SERVICE_ROLE_KEY` (pas
la clé anon) pour ses propres requêtes internes (ex: lookup de membership dans
`auth.ts`), puisque ces requêtes ne portent pas la session de l'utilisateur final — la
RLS basée sur `auth.uid()` les bloquerait sinon silencieusement. L'autorisation par
utilisateur reste vérifiée en code (`auth.ts`), la RLS est une deuxième ligne de
défense, en particulier pour tout accès direct mobile → Supabase (Realtime).

Le backend possède un garde-fou d'authentification Bearer : en production
(`NODE_ENV=production`), l'authentification est exigée par défaut — `REQUIRE_AUTH=false`
est refusé au démarrage. Hors production (dev local, tests Expo Go sans Supabase
configuré), elle reste optionnelle par défaut pour ne pas bloquer les tests en mode
mock ; il faut poser `REQUIRE_AUTH=true` explicitement pour l'exiger localement. Quand
elle est active, les routes métier refusent les requêtes sans token, vérifient le token
auprès de Supabase Auth et exigent une appartenance active à un restaurant. Le client
mobile sait transmettre le token via son client HTTP.

L'intégration physique d'un équipier temporaire se fait dans l'application par invitation
QR. Un manager authentifié génère une invitation serveur à usage unique avec expiration.
L'intérimaire scanne le QR dans Restau Plus et la redemption publique est limitée au token
opaque de l'invitation. La génération reste protégée par le restaurant du manager ; le QR
ne contient aucune donnée client ni clé d'accès permanente.

## Départements, lieux et PMS (cible hôtelière)

L'application vise à équiper tous les services d'un hôtel, pas seulement la salle et la
cuisine. Modèle retenu : **départements × modules**.

- Un **département** est une équipe (membres N0-N2, canal, délégations, compte rendu).
  Catalogue de types dans `packages/types/src/departements.ts` : direction, salle,
  cuisine, maintenance, espaces verts, gouvernance. Le niveau N0-N3 est commun ; seul
  l'intitulé change selon le département.
- Un **module** est un outil activé par un département : plan de salle, stock, HACCP,
  tickets inter-départements, planning, préventif, chambres…
- Le **référentiel des lieux** (`lieux.ts`) décrit l'établissement : bâtiment > étage >
  chambre / salle / espace extérieur / équipement. Tickets, gouvernance et préventif
  s'appuient dessus.
- Le **PMS** de l'hôtel fait foi pour l'occupation des chambres ; Resto Plus fait foi pour
  le statut ménage. Tout échange passe par `backend/api/src/pms/` (contrat `PmsConnector`,
  note d'intégration en tête de `index.ts`). Sans PMS, connecteur manuel.
- La **mise en place d'un client** (départements, lieux, PMS, horaires) est préparée par le
  N4 dans la console plateforme avant livraison : `ConfigurationEtablissement`
  (`etablissement.ts`).

État : fondations (types + contrat PMS) seulement. Le code utilise encore le type fermé
`Pole` ; la bascule vers des départements en données est prévue pendant le branchement
Supabase. Suivi détaillé : `docs/axes-de-progression.md`, section « Départements hôteliers ».

## Sécurité : règles à respecter pour toute nouvelle fonctionnalité

1. **Supabase ne sert qu'à l'authentification côté mobile.** L'app ne contient jamais la
   clé `service_role` (seule la clé publique `anon`, le jour où elle sera nécessaire) et
   ne lit ni n'écrit aucune table directement : toutes les données passent par l'API.
2. **RLS activée sur toutes les tables, sans exception** (migration 0013). Aucune
   écriture directe n'est permise ; la lecture directe est limitée aux données
   opérationnelles du restaurant du membre ; les données sensibles (clients,
   réservations, messagerie, comptes rendus, délégations, commandes, audit) ne sont
   lisibles que par l'API. Une vue doit être créée avec `security_invoker = true`.
3. **L'API utilise `service_role`, qui ignore la RLS : l'isolation entre restaurants se
   joue donc dans Fastify.** Toute route qui lit un objet par son id passe par
   `appartient()` (`backend/api/src/tenant.ts`) et répond 404 si l'objet appartient à un
   autre restaurant ; toute liste passe par `duRestaurant()` ; le restaurant d'un objet
   créé vient toujours de la session, jamais du corps de la requête.
4. **Les droits (niveau N0-N3, pôle) viennent de la matrice partagée**
   `packages/types/src/permissions.ts`, appliquée par `requirePermission()`.
5. **Test obligatoire après toute nouvelle route** : `yarn workspace @resto-plus/api test:isolation`
   (le restaurant B tente chaque action sur les données du restaurant A).

⚠️ **Mode démo** (`REQUIRE_AUTH=false`) : les en-têtes `X-Demo-User-*` et
`X-Demo-Restaurant-Id` sont falsifiables et la console plateforme N4 est ouverte. Ces
abaissements sont signalés par de gros commentaires dans `tenant.ts`, `demoIdentity.ts`
et `routes/platform.ts`, et disparaissent dès que l'authentification est exigée.
