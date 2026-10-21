# Resto Plus / PalaceOS

Solution mobile bi-espace (Opérationnel / Académie) pour la restauration, puis l'hôtellerie
jusqu'au moyen standing. Focus actuel : la restauration.

**Feuille de route et tâches en cours : [`docs/axes-de-progression.md`](./docs/axes-de-progression.md)**
(encadré « Ordre de marche » en tête, à relire en début de session).

## Démarrer

Prérequis : `backend/api/.env` rempli (Supabase de dev, voir `backend/api/.env.example`) —
sans lui, l'API tourne sur des données de démo en mémoire.

```bash
yarn install
yarn dev:api      # lance l'API Fastify (lit backend/api/.env : base Supabase de dev)
yarn dev:mobile   # lance l'app Expo
```

## Commandes utiles (API)

```bash
yarn workspace @resto-plus/api test           # tests en mémoire (Vitest), sans serveur
yarn workspace @resto-plus/api test:supabase  # tests d'intégration sur la base de dev
yarn workspace @resto-plus/api typecheck      # vérification TypeScript
yarn workspace @resto-plus/api db:migrate     # applique les migrations manquantes (--a-blanc : essai)
yarn workspace @resto-plus/api db:seed        # remet les données de démo à zéro
```

## Documentation

| Document | Pour quoi |
|---|---|
| [`docs/axes-de-progression.md`](./docs/axes-de-progression.md) | Feuille de route, tâches à cocher, ordre de marche |
| [`docs/tests-telephone.md`](./docs/tests-telephone.md) | Ce qu'il reste à vérifier sur téléphone |
| [`docs/architecture.md`](./docs/architecture.md) | Architecture technique, règles de sécurité |
| [`docs/migrations.md`](./docs/migrations.md) | Les migrations SQL en bref, tables, automatismes |
| [`docs/rgpd.md`](./docs/rgpd.md) | Registre RGPD et points à faire valider |
| [`docs/guide-mise-en-place.md`](./docs/guide-mise-en-place.md) | Pour le technicien : installer un restaurant |
| [`docs/arguments-de-vente.md`](./docs/arguments-de-vente.md) | Arguments commerciaux, pistes de facturation |
| [`docs/comptes-demo.md`](./docs/comptes-demo.md) | Comptes de démonstration (tests) |
| `docs/compte-rendu-*.md` | Comptes rendus de session |

## Statut

**P1 — branchement Supabase** en cours. En base : plan de salle, réservations, clients,
checklists HACCP, droits réglables par établissement. Encore en mémoire : stock, carte et
commandes, messagerie, comptes rendus, comptes de l'équipe, délégations, journal d'audit.
Connexion : comptes de démo (Supabase Auth pas encore branché).
