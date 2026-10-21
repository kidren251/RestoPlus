# Resto Plus / PalaceOS

Solution mobile bi-espace (Opérationnel / Académie) pour la restauration, puis l'hôtellerie
jusqu'au moyen standing. Focus actuel : la restauration.

**Feuille de route et tâches en cours : [`docs/axes-de-progression.md`](./docs/axes-de-progression.md)**
(encadré « Ordre de marche » en tête, à relire en début de session).

## Démarrer

```bash
yarn install
yarn dev:mobile   # lance l'app Expo
yarn dev:api      # lance l'API Fastify
yarn workspace @resto-plus/api test        # tests de l'API (Vitest)
yarn workspace @resto-plus/api typecheck   # vérification TypeScript de l'API
```

## Documentation
Voir [`docs/architecture.md`](./docs/architecture.md) pour l'architecture technique complète
et la feuille de route de référence.

## Statut
Prototype fonctionnel (API en mémoire, comptes de démo). En cours : **P1 — branchement
Supabase et authentification réelle**. Détail dans `docs/axes-de-progression.md`.
