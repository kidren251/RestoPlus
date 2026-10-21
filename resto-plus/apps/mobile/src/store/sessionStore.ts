/**
 * Session utilisateur courante — Resto Plus
 * Identité minimale nécessaire à la messagerie (qui parle, à qui il peut écrire).
 * Alimentée à la connexion (compte de démo ou invitation QR) — voir AppNavigator.
 */

import { create } from "zustand";
import type { AccessRole, Delegation, Pole, ReglagesDroits } from "@resto-plus/types";
import { api, setDemoIdentity } from "../api/client";

export interface CurrentUser {
  id: string;
  nom: string;
  accessRole: AccessRole;
  pole: Pole;
}

interface SessionState {
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void;
  /**
   * Niveau effectif vu par l'API (`/session/droits`) : peut être relevé par une
   * délégation reçue du N3 (N1 → droits du N2). Distinct de `currentUser.accessRole`,
   * qui reste le niveau du compte. Lu par `usePermissions()`.
   */
  effectiveAccessRole: AccessRole | null;
  delegation: Delegation | undefined;
  setDroits: (accessRole: AccessRole, delegation: Delegation | undefined) => void;
  /**
   * Verrou anti-clic accidentel du directeur (N3) sur les actions de service
   * (commander, réclamer, suivi du dîner…). Ce n'est pas un droit : le N3 garde la
   * permission côté API, il doit juste déverrouiller explicitement. Reverrouillé à
   * chaque entrée sur le plan de salle.
   */
  serviceUnlocked: boolean;
  setServiceUnlocked: (unlocked: boolean) => void;
  /**
   * Niveaux des droits du service réglés par le N4 pour cet établissement (console
   * plateforme). Chargés à la connexion ; {} = valeurs par défaut. Lus par usePermissions().
   */
  reglagesDroits: ReglagesDroits;
  chargerReglagesDroits: () => Promise<void>;
}

/** Le verrou de service ne concerne que le directeur, qui n'est pas en salle pendant le service. */
export function isServiceLocked(user: CurrentUser | null, serviceUnlocked: boolean): boolean {
  return user?.accessRole === "directeur_admin" && !serviceUnlocked;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  currentUser: null,
  effectiveAccessRole: null,
  delegation: undefined,
  serviceUnlocked: false,
  reglagesDroits: {},
  chargerReglagesDroits: async () => {
    try {
      const { reglages } = await api.get<{ reglages: ReglagesDroits }>("/restaurant/reglages-droits");
      set({ reglagesDroits: reglages });
    } catch {
      // Hors ligne : on garde les derniers réglages connus (l'API reste seule juge).
    }
  },
  setServiceUnlocked: (unlocked) => set({ serviceUnlocked: unlocked }),
  setDroits: (accessRole, delegation) => set({ effectiveAccessRole: accessRole, delegation }),
  setCurrentUser: (user) => {
    set({ currentUser: user, effectiveAccessRole: user?.accessRole ?? null, delegation: undefined, serviceUnlocked: false });
    setDemoIdentity(user ? { id: user.id, nom: user.nom, accessRole: user.accessRole, pole: user.pole } : null);
    if (user) void get().chargerReglagesDroits();
    else set({ reglagesDroits: {} });
  },
}));
