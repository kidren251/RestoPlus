-- Plan HACCP modifiable et seuils par point de contrôle.
--
-- 1. Fréquences du plan inspiré du GBPH du restaurateur : réception des marchandises,
--    ouverture, service (refroidissement, remise en température, maintien), fermeture,
--    contrôles hebdomadaires.
-- 2. Seuils : un point chiffré a un minimum et/ou un maximum et une unité. La
--    conformité d'un relevé chiffré est calculée par l'API à partir de ces seuils.
-- 3. Un relevé garde une COPIE du libellé, des seuils et de l'unité au moment où il est
--    fait : si le plan change ensuite, un relevé ancien reste lisible tel qu'il a été
--    fait (exigence de traçabilité lors d'un contrôle sanitaire).
-- 4. Un point retiré du plan est désactivé, jamais supprimé : ses relevés gardent leur sens.

alter table checklists drop constraint checklists_frequence_check;
alter table checklists add constraint checklists_frequence_check
  check (frequence in ('reception', 'ouverture', 'service', 'fermeture', '4h', 'hebdomadaire'));

alter table checklist_items
  add column seuil_min numeric,
  add column seuil_max numeric,
  add column unite text,
  add column consigne text,
  add column actif boolean not null default true,
  add constraint checklist_items_seuils_ordonnes check (seuil_min is null or seuil_max is null or seuil_min <= seuil_max),
  add constraint checklist_items_seuils_si_valeur check (requiert_valeur or (seuil_min is null and seuil_max is null));

alter table checklist_entries
  add column libelle text,
  add column seuil_min numeric,
  add column seuil_max numeric,
  add column unite text;
