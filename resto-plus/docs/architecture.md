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
