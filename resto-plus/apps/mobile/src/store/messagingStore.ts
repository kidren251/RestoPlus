/**
 * Store messagerie — Resto Plus
 * Trois espaces distincts : tableau d'affichage ("annonce"), canaux de pôle
 * ("canal"), messages directs ("dm", limités à la ligne hiérarchique directe —
 * voir demarrerDM). Rafraîchi par polling (pas de temps réel tant que Supabase
 * Realtime n'est pas branché) — voir docs/architecture.md.
 */

import { create } from "zustand";
import type { AccessRole, ChatMessage, Conversation, Destinataire, Pole } from "@resto-plus/types";
import { api, ApiError, messageErreur } from "../api/client";
import { enqueueSync } from "./syncStore";

interface MessagingState {
  conversations: Conversation[];
  messagesByConversation: Record<string, ChatMessage[]>;
  /** Personnes joignables en message direct (annuaire filtré par l'API). */
  destinataires: Destinataire[];
  /** Messagerie coupée par la direction pour ce compte : message à afficher. */
  accesRefuse: string | null;
  isLoading: boolean;

  loadConversations: () => Promise<void>;
  loadDestinataires: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  envoyerMessage: (
    conversationId: string,
    emetteurId: string,
    emetteurNom: string,
    emetteurAccessRole: AccessRole,
    contenu: string
  ) => void;
  demarrerDM: (target: Destinataire) => Promise<Conversation | undefined>;
  creerCanal: (nom: string, pole: Pole) => Promise<Conversation | undefined>;
}

let _localMsgIdCounter = 0;

export const useMessagingStore = create<MessagingState>((set, get) => ({
  conversations: [],
  messagesByConversation: {},
  destinataires: [],
  accesRefuse: null,
  isLoading: false,

  loadConversations: async () => {
    set({ isLoading: true });
    try {
      const data = await api.get<Conversation[]>("/conversations");
      set({ conversations: data, accesRefuse: null, isLoading: false });
    } catch (error) {
      // 403 : accès messagerie coupé par le N3 (hors ligne, on garde l'état connu).
      const refuse = error instanceof ApiError && error.status === 403;
      set({ isLoading: false, ...(refuse ? { accesRefuse: messageErreur(error), conversations: [] } : {}) });
    }
  },

  loadDestinataires: async () => {
    try {
      const data = await api.get<Destinataire[]>("/messagerie/destinataires");
      set({ destinataires: data });
    } catch {
      // Hors ligne ou accès refusé : on garde la liste connue.
    }
  },

  loadMessages: async (conversationId) => {
    try {
      const data = await api.get<ChatMessage[]>(`/conversations/${conversationId}/messages`);
      set((state) => ({ messagesByConversation: { ...state.messagesByConversation, [conversationId]: data } }));
    } catch {
      // Hors ligne : on garde les messages déjà connus localement.
    }
  },

  envoyerMessage: (conversationId, emetteurId, emetteurNom, emetteurAccessRole, contenu) => {
    const message: ChatMessage = {
      id: `local_msg_${Date.now()}_${_localMsgIdCounter++}`,
      conversationId,
      emetteurId,
      emetteurNom,
      emetteurAccessRole,
      contenu,
      timestamp: new Date().toISOString(),
    };
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: [message, ...(state.messagesByConversation[conversationId] ?? [])],
      },
    }));
    enqueueSync("message_send", { conversationId, contenu });
  },

  demarrerDM: async (target) => {
    try {
      const conversation = await api.post<Conversation>("/conversations/dm", { targetId: target.id });
      set((state) => ({
        conversations: state.conversations.some((c) => c.id === conversation.id)
          ? state.conversations
          : [...state.conversations, { ...conversation, nom: target.nom }],
      }));
      return conversation;
    } catch {
      return undefined;
    }
  },

  creerCanal: async (nom, pole) => {
    try {
      const conversation = await api.post<Conversation>("/conversations/canaux", { nom, pole });
      set((state) => ({ conversations: [...state.conversations, conversation] }));
      return conversation;
    } catch {
      return undefined;
    }
  },
}));
