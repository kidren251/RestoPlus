-- Hiérarchie d'accès Resto Plus : N0 à N3 côté restaurant.
-- Le niveau N4 (dev_creator) reste un rôle de plateforme, jamais un membre restaurant.

alter table users drop constraint if exists users_access_role_check;
alter table users add constraint users_access_role_check
  check (access_role in ('manager_admin', 'directeur_admin', 'chef_rang', 'serveur'));

alter table restaurant_members drop constraint if exists restaurant_members_access_role_check;
alter table restaurant_members add constraint restaurant_members_access_role_check
  check (access_role in ('manager_admin', 'directeur_admin', 'chef_rang', 'serveur'));
