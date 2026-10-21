# Resto Plus — Les migrations SQL en bref

Aide-mémoire du schéma de la base. Les fichiers sont dans `backend/db/migrations/`,
appliqués dans l'ordre. **Une migration appliquée ne se modifie plus** : pour changer
quelque chose, on en écrit une nouvelle.

Dernière mise à jour : 21 octobre 2026 — 17 migrations, toutes appliquées sur la base
de dev (`restau-plus.v1-dev`, Paris).

## Commandes

```bash
yarn workspace @resto-plus/api db:migrate            # applique les migrations manquantes
yarn workspace @resto-plus/api db:migrate --a-blanc  # essai : tout est annulé à la fin
yarn workspace @resto-plus/api db:seed               # (ré)insère les données de démo
```

Les migrations déjà appliquées sont notées dans `outils.migrations` : le script ne
rejoue jamais deux fois la même. Connexion : `SUPABASE_DB_URL` dans `backend/api/.env`.

## Migration par migration

### Le socle

| # | Fichier | Ce qu'elle fait |
|---|---|---|
| 0001 | `init` | Premières tables : utilisateurs, salles, tables (position, forme, capacité, statut), réservations, checklists HACCP et leurs relevés. |
| 0002 | `clients_reservations_service` | Fiches clients, statut et origine des réservations (téléphone, site, walk-in…), événements du dîner (arrivée, entrée servie, plat servi…). |
| 0003 | `multi_restaurant_isolation` | **Multi-restaurant** : table `restaurants`, table `restaurant_members` (qui appartient à quel restaurant, avec quel niveau) ; chaque donnée porte un `restaurant_id`. |
| 0004 | `restaurant_invitations` | Invitations QR des intérimaires : usage unique, expiration, jeton stocké haché. |
| 0005 | `access_levels` | Niveaux N0 à N3 (serveur, chef de rang, manager, directeur). |

### La sécurité

| # | Fichier | Ce qu'elle fait |
|---|---|---|
| 0006 | `row_level_security` | **RLS** : Postgres lui-même refuse qu'un utilisateur lise les données d'un autre restaurant. Fonctions `is_restaurant_member()` / `is_restaurant_admin()`. |

### Les fonctionnalités métier

| # | Fichier | Ce qu'elle fait |
|---|---|---|
| 0007 | `stock` | Articles de stock (unité, seuil d'alerte) et journal des mouvements (réception, sortie, perte, ajustement). |
| 0008 | `pole_menu_marge` | Pôles salle / cuisine / direction, carte des plats et leurs ingrédients, alertes de seuil, coût d'achat (base du calcul de marge). |
| 0009 | `messagerie` | Trois espaces : annonces (N2/N3), canal d'équipe, messages privés. |
| 0010 | `comptes_rendus_comptes_equipe` | Comptes rendus de service ; sorties de stock **provisoires** jusqu'à validation du chef ; journal des plats commandés ; comptes employés permanents activés par code. |
| 0011 | `journee_service_delegations_messagerie` | **Journée de service** (un dîner fini à 2h compte pour la veille ; bascule à 5h, réglable), **délégations** N1 → N2, accès messagerie par membre, vue des clôtures de journée. |

### L'audit et le durcissement

| # | Fichier | Ce qu'elle fait |
|---|---|---|
| 0012 | `journal_audit` | **Journal d'audit infalsifiable** : ni modification ni suppression, chaque ligne chaînée à la précédente par une empreinte, purge légale au terme de la conservation (comptabilité 10 ans, HACCP 5, administration 5, sécurité 1). |
| 0013 | `durcissement_rls` | RLS sur toutes les tables ; l'app ne peut plus rien écrire directement (tout passe par l'API) ; plus aucune lecture directe des données sensibles (clients, réservations, messages, comptes rendus). |

### P1 — branchement Supabase (21/10/2026)

| # | Fichier | Ce qu'elle fait |
|---|---|---|
| 0014 | `auth_unifiee_departements` | `users` devient le **profil d'un compte Supabase Auth** (même identifiant, créé automatiquement). Les **départements** deviennent des données : table `departements` (catalogue : direction, salle, cuisine, maintenance, espaces verts, gouvernance), colonnes `pole` → `departement`. Clôture de journée générique : tous les départements dont le compte rendu est requis. |
| 0015 | `rgpd` | **RGPD** : allergies seulement le temps du repas (jamais sur la fiche client, refusées sans signalement du client, effacées à la fin du repas) ; durées de conservation par établissement ; anonymisation à la demande ; purge automatique chaque nuit (3h30) et effacement des allergies toutes les heures. Ferme une faille : la purge de l'audit était appelable avec la clé publique. Détails : `docs/rgpd.md`. |
| 0016 | `plan_de_salle` | Ce qu'il manquait pour brancher le plan de salle : nom et zone des tables, positions décimales, **décor** (`elements_decor`), **repas en cours** à chaque table (`etat_service_tables`). |
| 0017 | `reservations_installation` | **Droits du service réglables** par établissement (`restaurants.reglages_droits`, console N4). Réservations : heure locale « 19:30 » convertie en instant exact avec le fuseau du restaurant (0h30 compte pour la veille). Trois **gestes du service** en une transaction chacun : `installer_clients` (réservation ou walk-in « sans résa »), `deplacer_repas` (changer de table), `terminer_repas` (addition). Nouveau type d'événement `changement_table`. |

## Les tables par thème

| Thème | Tables |
|---|---|
| Établissement et équipe | `restaurants` (dont les droits réglés par le N4), `departements`, `users` (profils), `restaurant_members`, `comptes_equipe`, `restaurant_invitations`, `delegations` |
| Salle | `salles`, `tables_salle`, `elements_decor`, `etat_service_tables` |
| Clients et service | `clients`, `reservations`, `service_events`, `commandes_plats` |
| Cuisine | `stock_items`, `stock_movements`, `stock_alerts`, `menu_items`, `menu_item_ingredients`, `checklists`, `checklist_items`, `checklist_entries` |
| Communication | `conversations`, `chat_messages` |
| Pilotage | `comptes_rendus`, vue `journees_service` |
| Audit | `audit_log`, `audit_ancres`, `audit_conservation` |

## Qui peut lire quoi

- **L'API** (clé `service_role`, côté serveur) : tout. Elle applique elle-même les
  droits N0-N3 et l'isolation par restaurant.
- **L'app en direct** (clé publique + session) : seulement la lecture des données
  opérationnelles de son restaurant (salles, tables, décor, stock, carte, relevés
  HACCP, départements). Jamais d'écriture, jamais de données sensibles.
- **Personne** : modifier ou supprimer le journal d'audit (hors purge légale).

## Automatismes (pg_cron)

| Tâche | Quand | Rôle |
|---|---|---|
| `allergenes-fin-de-service` | toutes les heures | Efface les allergies des repas d'une journée de service passée |
| `rgpd-purge-quotidienne` | chaque nuit à 3h30 | Anonymise clients inactifs, anciennes réservations et anciens membres ; supprime les vieux messages ; purge l'audit expiré |
