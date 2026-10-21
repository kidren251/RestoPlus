import React from "react";
import type { Permission } from "@resto-plus/types";
import { usePermissions } from "../hooks/usePermissions";
import { RestrictedMessage } from "./RestrictedMessage";

/**
 * Affiche l'écran seulement si l'utilisateur a le droit demandé, sinon un message.
 * `allowed` remplace `permission` pour les conditions qui ne sont pas un droit de la
 * matrice (pôle de l'espace, console N4).
 */
export function RequirePermission({
  permission,
  allowed,
  message,
  children,
}: {
  permission?: Permission;
  allowed?: boolean;
  message: string;
  children: React.ReactNode;
}) {
  const allows = usePermissions();
  const ok = (permission === undefined || allows(permission)) && allowed !== false;
  return ok ? <>{children}</> : <RestrictedMessage text={message} />;
}
