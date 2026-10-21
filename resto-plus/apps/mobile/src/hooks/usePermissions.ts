import { useCallback } from "react";
import { can, type Permission } from "@resto-plus/types";
import { isServiceLocked, useSessionStore } from "../store/sessionStore";

/**
 * Droits de l'utilisateur connecté — même matrice que l'API
 * (packages/types/src/permissions.ts). Sert uniquement à masquer ou verrouiller
 * l'interface : c'est l'API qui refuse réellement les actions non autorisées.
 *
 * Utilise le niveau effectif (relevé par une délégation éventuelle), le pôle du compte
 * et les niveaux réglés par le N4 pour l'établissement.
 */
export function usePermissions(): (permission: Permission) => boolean {
  const accessRole = useSessionStore((state) => state.effectiveAccessRole);
  const pole = useSessionStore((state) => state.currentUser?.pole);
  const reglages = useSessionStore((state) => state.reglagesDroits);
  return useCallback(
    (permission: Permission) => !!accessRole && !!pole && can({ accessRole, pole }, permission, reglages),
    [accessRole, pole, reglages]
  );
}

/** Verrou anti-fausse manipulation du directeur sur les actions de service (voir sessionStore). */
export function useServiceLocked(): boolean {
  const currentUser = useSessionStore((state) => state.currentUser);
  const serviceUnlocked = useSessionStore((state) => state.serviceUnlocked);
  return isServiceLocked(currentUser, serviceUnlocked);
}
