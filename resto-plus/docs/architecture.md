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
Voir la feuille de route complète discutée en conversation :
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
Les utilisateurs sont reliés à un restaurant par `restaurant_members`, avec un rôle
`manager_admin`, `chef_rang` ou `serveur`. Les salles, tables, clients, réservations et
événements de service portent un `restaurant_id`.

En production, chaque requête devra être filtrée par le restaurant issu de la session
authentifiée. Les policies Supabase RLS devront empêcher toute lecture ou écriture hors
de ce périmètre, y compris si un utilisateur modifie directement un identifiant dans
une requête. Il ne faut pas utiliser le nom du restaurant ou un paramètre mobile comme
preuve d'appartenance.

Le backend possède désormais un premier garde-fou d'authentification Bearer : avec
`REQUIRE_AUTH=true`, les routes métier refusent les requêtes sans token, vérifient le
token auprès de Supabase Auth et exigent une appartenance active à un restaurant. Le
client mobile sait transmettre le token via son client HTTP. Cette étape ne remplace
pas encore les policies RLS ni le filtrage métier de chaque requête.

L'intégration physique d'un équipier temporaire se fait dans l'application par invitation
QR. Un manager authentifié génère une invitation serveur à usage unique avec expiration.
L'intérimaire scanne le QR dans Restau Plus et la redemption publique est limitée au token
opaque de l'invitation. La génération reste protégée par le restaurant du manager ; le QR
ne contient aucune donnée client ni clé d'accès permanente.
