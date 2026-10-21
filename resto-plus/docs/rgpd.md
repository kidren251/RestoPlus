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
| **Allergies** (donnée de santé, art. 9) | `clients.allergies`, `reservations.allergenes` | Sécurité alimentaire du client | **Consentement explicite** (date gardée dans `consentement_allergies_at`) | Comme la fiche client ; effacée sur simple demande |
| Réservation : nom, couverts, heure, notes | `reservations` | Organiser le service | Contrat | 3 ans, puis anonymisation (couverts et dates gardés pour les statistiques) |
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
- **Allergies refusées sans consentement** : la base rejette une fiche avec allergies
  si la date de consentement est vide.
- **Ces fonctions ne sont appelables que par l'API** (clé `service_role`), jamais avec
  la clé publique de l'app.

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
- [ ] App : case « le client consent à l'enregistrement de ses allergies » sur la fiche
      client (sans elle, les allergies ne peuvent pas être enregistrées)
- [ ] Export des données d'une personne (droit d'accès et de portabilité)
- [ ] Réglage des durées de conservation dans la console N3 / N4

À faire valider par un juriste / DPO :
- [ ] Durées : clients 3 ans, messages 12 mois, anciens membres 12 mois, journal
      d'audit (10 / 5 / 5 / 1 ans)
- [ ] Bases légales du tableau ci-dessus, en particulier le consentement pour les allergies
- [ ] Le maintien du nom de l'acteur dans le journal d'audit
- [ ] Contrat de sous-traitance (DPA) type pour les établissements
- [ ] Hébergement : région Supabase **Paris (eu-west-3)** — vérifier les clauses de
      transfert hors UE de Supabase (société américaine)
- [ ] Mentions d'information des clients (au moment de la réservation) et des employés
- [ ] Analyse d'impact (AIPD) : probablement requise à cause des données de santé
