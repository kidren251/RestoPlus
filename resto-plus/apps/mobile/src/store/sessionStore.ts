/**
 * Session utilisateur courante — Resto Plus
 * Identité minimale nécessaire à la messagerie (qui parle, à qui il peut écrire).
 * Alimentée à la connexion (compte de démo ou invitation QR) — voir AppNavigator.
 */

import { create } from "zustand";
import type { AccessRole, Pole } from "@resto-plus/types";
import { setDemoIdentity } from "../api/client";

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
   * Verrou anti-clic accidentel du directeur (N3) sur les actions de service
   * (commander, réclamer, suivi du dîner…). Ce n'est pas un droit : le N3 garde la
   * permission côté API, il doit juste déverrouiller explicitement. Reverrouillé à
   * chaque entrée sur le plan de salle.
   */
  serviceUnlocked: boolean;
  setServiceUnlocked: (unlocked: boolean) => void;
}

/** Le verrou de service ne concerne que le directeur, qui n'est pas en salle pendant le service. */
export function isServiceLocked(user: CurrentUser | null, serviceUnlocked: boolean): boolean {
  return user?.accessRole === "directeur_admin" && !serviceUnlocked;
}

export const useSessionStore = create<SessionState>((set) => ({
  currentUser: null,
  serviceUnlocked: false,
  setServiceUnlocked: (unlocked) => set({ serviceUnlocked: unlocked }),
  setCurrentUser: (user) => {
    set({ currentUser: user, serviceUnlocked: false });
    setDemoIdentity(user ? { id: user.id, nom: user.nom, accessRole: user.accessRole, pole: user.pole } : null);
  },
}));
