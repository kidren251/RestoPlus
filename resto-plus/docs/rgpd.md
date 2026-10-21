# Resto Plus — RGPD

Base de travail pour le registre des traitements et pour la validation par un juriste /
DPO. Mise en œuvre technique : migration `backend/db/migrations/0015_rgpd.sql`.

Dernière mise à jour : 21 octobre 2026.

## Rôles

Pour les données de ses clients et de ses employés, **l'établissement est responsable
de traitement**. Resto Plus est son **sous-traitant** (article 28) : il faut donc un
contrat de sous-traitance (DPA) avec chaque établissement, et Resto Plus doit lui-même
encadrer ses propres sous-traitants (Supabase, hébergement de l'API).

## Inventaire des données personnelles

| Données | Tables | Finalité | Base légale (proposée) | Conservation |
|---|---|---|---|---|
| Fiche client : nom, téléphone, e-mail, préférences, notes | `clients` | Gérer les réservations, personnaliser l'accueil | Contrat / intérêt légitime | 3 ans après la dernière visite, puis anonymisation |
| **Allergies** (donnée de santé, art. 9) | `reservations.allergenes` uniquement (jamais sur la fiche client) | Sécurité alimentaire du client pendant son repas | **Consentement explicite** : le client les signale lui-même (heure gardée dans `allergenes_signales_at`) | **Le temps du repas** : effacées à la fin du repas (addition, annulation), au plus tard à la fin de la journée de service |
| Réservation : nom, couverts, heure, notes | `reservations` (un client sans réservation en a une, source `walk_in`) | Organiser le service | Contrat | 3 ans, puis anonymisation (couverts et dates gardés pour les statistiques) |
| Employé : nom, niveau, département | `users`, `restaurant_members`, `comptes_equipe` | Accès à l'outil, droits | Contrat de travail / intérêt légitime | Tant qu'il est actif, puis anonymisé 12 mois après son départ |
| Compte de connexion : e-mail, mot de passe (haché) | `auth.users` (Supabase) | Authentification | Contrat de travail | Effacé au départ (suppression « douce » par l'API) |
| Messagerie interne | `chat_messages` | Coordination du service | Intérêt légitime | 12 mois |
| Journal d'audit : acteur (nom), action, adresse IP des connexions | `audit_log` | Traçabilité légale et sécurité | Obligation légale / intérêt légitime | Comptabilité 10 ans, HACCP 5 ans, administration 5 ans, sécurité 1 an (`audit_conservation`) |

Les durées « clients », « messages » et « anciens membres » se règlent par
établissement (colonnes `conservation_*_mois` de `restaurants`).

## Ce que fait la base

- **Purge automatique chaque nuit à 3h30** (`rgpd_purger()`, via pg_cron) : clients
  inactifs, réservations anciennes, messages, anciens membres, puis fin de conservation
  du journal d'audit. Un client qui a une réservation à venir n'est jamais anonymisé.
- **Droit à l'effacement à la demande** : `rgpd_anonymiser_client(id)` et
  `rgpd_anonymiser_membre(user_id, restaurant_id)`.
- **Anonymiser plutôt que supprimer** : les lignes restent pour que le chiffre
  d'affaires, le stock, les relevés HACCP et les comptes rendus restent justes, mais
  plus rien n'identifie la personne (« Client anonymisé », « Ancien membre 4CBB »).
- **Allergies limitées au repas** : refusées sans signalement du client, effacées à la
  fin du repas (trigger) et au plus tard à la fin de la journée de service
  (`effacer_allergenes_services_passes()`, toutes les heures).
- **Ces fonctions ne sont appelables que par l'API** (clé `service_role`), jamais avec
  la clé publique de l'app.

## Allergies : le temps du repas, jamais sur la fiche client (décision du 21/10/2026)

Les allergies sont des données de santé (art. 9), lourdes à gérer légalement si on les
conserve. Décision : **on ne constitue aucun dossier médical durable**.

- Elles ne sont jamais enregistrées sur la fiche client, seulement sur le repas
  (réservation en base, état de la table dans l'app).
- Le serveur coche « signalées par le client lui-même, pour ce repas » : c'est le
  consentement, horodaté. Sans cette case, l'app, l'API et la base refusent.
- Elles sont effacées à l'addition ou à l'annulation, et au plus tard à la fin de la
  journée de service (passage automatique toutes les heures).
- Conséquence assumée : un client fidèle redonne ses allergies à chaque visite. C'est
  aussi la bonne pratique de sécurité alimentaire (une allergie peut changer).
- Reste une donnée de santé pendant quelques heures : il faut toujours une base légale
  (le consentement ci-dessus) et la mention dans l'information des clients, mais plus
  de durée de conservation à justifier ni de dossier à protéger dans le temps.

## Exception assumée : le journal d'audit

Le journal d'audit est infalsifiable (`0012`) : on ne peut pas y remplacer un nom.
Il garde donc le nom de l'acteur pendant sa durée de conservation légale (savoir qui a
validé un relevé HACCP ou une sortie de stock est justement son rôle), puis il est
purgé. Il ne contient jamais de données clients, de contenu de message ni de mot de
passe. **À faire valider.**

## Reste à faire

Technique (pendant le branchement Supabase, P1) :
- [ ] Routes API « anonymiser un client » (N2/N3 salle) et « départ d'un membre » (N3),
      journalisées, qui appellent les fonctions ci-dessus — et, pour un membre,
      `auth.admin.deleteUser(id, true)`
- [x] App : allergies « pour ce repas » + case « signalées par le client » sur l'écran
      de la table, effacées à l'addition (21/10/2026)
- [ ] Formulaire de réservation : saisir les allergies signalées à la réservation
      (même case de consentement)
- [ ] Export des données d'une personne (droit d'accès et de portabilité)
- [ ] Réglage des durées de conservation dans la console N3 / N4

À faire valider par un juriste / DPO :
- [ ] Durées : clients 3 ans, messages 12 mois, anciens membres 12 mois, journal
      d'audit (10 / 5 / 5 / 1 ans)
- [ ] Bases légales du tableau ci-dessus, en particulier le consentement pour les
      allergies tel que recueilli (case cochée par le serveur à la demande du client)
- [ ] Le maintien du nom de l'acteur dans le journal d'audit
- [ ] Contrat de sous-traitance (DPA) type pour les établissements
- [ ] Hébergement : région Supabase **Paris (eu-west-3)** — vérifier les clauses de
      transfert hors UE de Supabase (société américaine)
- [ ] Mentions d'information des clients (au moment de la réservation) et des employés
- [ ] Analyse d'impact (AIPD) : à confirmer — le risque est bien plus faible depuis
      que les allergies ne sont plus conservées au-delà du repas
