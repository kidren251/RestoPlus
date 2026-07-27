/**
 * Sync engine offline-first — socle transverse de Resto Plus / PalaceOS.
 *
 * Principe : toute action utilisateur (checklist, déplacement de table,
 * message) est d'abord écrite en local (queue), puis rejouée vers le
 * backend dès que le réseau est disponible. En cas de conflit, résolution
 * par timestamp + priorité métier (ex : une validation HACCP est prioritaire
 * sur un simple déplacement de table).
 */

export type SyncActionType =
  | "checklist_entry"
  | "table_move"
  | "table_status_change"
  | "message_send";

export interface QueuedAction<T = unknown> {
  id: string;
  type: SyncActionType;
  payload: T;
  createdAt: string;
  attempts: number;
  status: "pending" | "syncing" | "synced" | "failed";
}

export interface SyncEngineOptions {
  /** Appelé pour envoyer une action au backend. Doit lever une erreur si ça échoue. */
  send: (action: QueuedAction) => Promise<void>;
  /** Intervalle de retry en ms si offline ou échec. */
  retryIntervalMs?: number;
}

export class SyncEngine {
  private queue: QueuedAction[] = [];
  private isOnline = true;
  private options: SyncEngineOptions;

  constructor(options: SyncEngineOptions) {
    this.options = options;
  }

  enqueue<T>(type: SyncActionType, payload: T): QueuedAction<T> {
    const action: QueuedAction<T> = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
      status: "pending",
    };
    this.queue.push(action as QueuedAction);
    if (this.isOnline) void this.flush();
    return action;
  }

  setOnline(online: boolean) {
    this.isOnline = online;
    if (online) void this.flush();
  }

  getPendingCount(): number {
    return this.queue.filter((a) => a.status !== "synced").length;
  }

  private async flush() {
    for (const action of this.queue) {
      if (action.status === "synced") continue;
      action.status = "syncing";
      try {
        await this.options.send(action);
        action.status = "synced";
      } catch {
        action.attempts += 1;
        action.status = "failed";
        // TODO: backoff exponentiel + retry programmé
      }
    }
    this.queue = this.queue.filter((a) => a.status !== "synced");
  }
}
