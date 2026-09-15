/**
 * Comptes de démonstration — Resto Plus
 * 7 comptes de test couvrant chaque niveau d'accès (N0-N3), dans le pôle salle puis
 * dans le pôle cuisine. Le directeur d'établissement (N3) est un rôle unique par
 * établissement, en pôle "direction" (accès aux deux espaces) : il n'est donc
 * représenté qu'une fois plutôt que dupliqué par pôle.
 * Voir docs/comptes-demo.md pour la liste destinée aux testeurs.
 */

import type { AccessRole, Pole } from "@resto-plus/types";

export interface DemoAccount {
  id: string;
  login: string;
  password: string;
  label: string;
  accessRole: AccessRole;
  pole: Pole;
}

export const DEMO_PASSWORD = "resto2026";

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { id: "comptesalle-0", login: "comptesalle-0", password: DEMO_PASSWORD, label: "Serveur (N0) — pôle salle", accessRole: "serveur", pole: "salle" },
  { id: "comptesalle-1", login: "comptesalle-1", password: DEMO_PASSWORD, label: "Chef de rang (N1) — pôle salle", accessRole: "chef_rang", pole: "salle" },
  { id: "comptesalle-2", login: "comptesalle-2", password: DEMO_PASSWORD, label: "Manager de salle (N2) — pôle salle", accessRole: "manager_admin", pole: "salle" },
  { id: "comptesalle-3", login: "comptesalle-3", password: DEMO_PASSWORD, label: "Directeur d'établissement (N3) — direction", accessRole: "directeur_admin", pole: "direction" },
  { id: "comptecuisin-0", login: "comptecuisin-0", password: DEMO_PASSWORD, label: "Commis de cuisine (N0) — pôle cuisine", accessRole: "serveur", pole: "cuisine" },
  { id: "comptecuisin-1", login: "comptecuisin-1", password: DEMO_PASSWORD, label: "Chef de partie (N1) — pôle cuisine", accessRole: "chef_rang", pole: "cuisine" },
  { id: "comptecuisin-2", login: "comptecuisin-2", password: DEMO_PASSWORD, label: "Chef de cuisine (N2) — pôle cuisine", accessRole: "manager_admin", pole: "cuisine" },
];

export function findDemoAccount(login: string): DemoAccount | undefined {
  const needle = login.trim().toLowerCase();
  return DEMO_ACCOUNTS.find((account) => account.login.toLowerCase() === needle);
}
