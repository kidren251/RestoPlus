import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, spacing, typography } from "@resto-plus/ui-luxury";
import type { AccessRole, ChatMessage } from "@resto-plus/types";
import { useMessagingStore } from "../store/messagingStore";
import { useSessionStore } from "../store/sessionStore";
import { useKeyboardHeight } from "../hooks/useKeyboardHeight";

const REFRESH_MS = 4_000;

const ROLE_LABEL: Record<AccessRole, string> = {
  serveur: "Serveur",
  chef_rang: "Chef de rang",
  manager_admin: "Manager",
  directeur_admin: "Direction",
};

export function ConversationScreen({ conversationId }: { conversationId: string }) {
  const currentUser = useSessionStore((state) => state.currentUser);
  const conversation = useMessagingStore((state) => state.conversations.find((c) => c.id === conversationId));
  const messages = useMessagingStore((state) => state.messagesByConversation[conversationId] ?? []);
  const loadMessages = useMessagingStore((state) => state.loadMessages);
  const envoyerMessage = useMessagingStore((state) => state.envoyerMessage);
  const [contenu, setContenu] = useState("");
  const keyboardHeight = useKeyboardHeight();
  const scrollRef = useRef<ScrollView>(null);

  // Clavier ouvert : on garde les derniers messages visibles au-dessus de la saisie.
  useEffect(() => {
    if (keyboardHeight > 0) scrollRef.current?.scrollToEnd({ animated: true });
  }, [keyboardHeight]);

  useEffect(() => {
    loadMessages(conversationId);
    const interval = setInterval(() => loadMessages(conversationId), REFRESH_MS);
    return () => clearInterval(interval);
  }, [conversationId, loadMessages]);

  if (!currentUser) return null;

  const isAnnonce = conversation?.type === "annonce";
  const peutEcrire = isAnnonce ? currentUser.accessRole === "manager_admin" || currentUser.accessRole === "directeur_admin" : true;

  const envoyer = () => {
    if (!contenu.trim()) return;
    envoyerMessage(conversationId, currentUser.id, currentUser.nom, currentUser.accessRole, contenu.trim());
    setContenu("");
  };

  return (
    <View style={[styles.container, { paddingBottom: keyboardHeight }]}>
      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {messages.length === 0 && <Text style={styles.emptyText}>Aucun message pour l'instant.</Text>}
        {messages.map((message) =>
          isAnnonce ? (
            <AnnonceCard key={message.id} message={message} />
          ) : (
            <MessageBubble key={message.id} message={message} isMine={message.emetteurId === currentUser.id} />
          )
        )}
      </ScrollView>

      {peutEcrire ? (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={contenu}
            onChangeText={setContenu}
            placeholder={isAnnonce ? "Publier une annonce..." : "Écrire un message..."}
            multiline
          />
          <Pressable style={styles.sendButton} onPress={envoyer}>
            <Text style={styles.sendLabel}>Envoyer</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.readOnlyBar}>
          <Text style={styles.readOnlyText}>Lecture seule — seuls les managers et la direction publient ici.</Text>
        </View>
      )}
    </View>
  );
}

function AnnonceCard({ message }: { message: ChatMessage }) {
  const isDirection = message.emetteurAccessRole === "directeur_admin";
  return (
    <View style={[annonceStyles.card, isDirection && annonceStyles.cardDirection]}>
      <View style={annonceStyles.header}>
        <Text style={[annonceStyles.auteur, isDirection && annonceStyles.auteurDirection]}>{message.emetteurNom}</Text>
        <View style={[annonceStyles.badge, isDirection && annonceStyles.badgeDirection]}>
          <Text style={[annonceStyles.badgeLabel, isDirection && annonceStyles.badgeLabelDirection]}>{ROLE_LABEL[message.emetteurAccessRole]}</Text>
        </View>
      </View>
      <Text style={annonceStyles.contenu}>{message.contenu}</Text>
      <Text style={annonceStyles.date}>{new Date(message.timestamp).toLocaleString("fr-FR")}</Text>
    </View>
  );
}

function MessageBubble({ message, isMine }: { message: ChatMessage; isMine: boolean }) {
  return (
    <View style={[bubbleStyles.row, isMine && bubbleStyles.rowMine]}>
      <View style={[bubbleStyles.bubble, isMine && bubbleStyles.bubbleMine]}>
        {!isMine && <Text style={bubbleStyles.auteur}>{message.emetteurNom}</Text>}
        <Text style={[bubbleStyles.contenu, isMine && bubbleStyles.contenuMine]}>{message.contenu}</Text>
        <Text style={[bubbleStyles.date, isMine && bubbleStyles.dateMine]}>{new Date(message.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.md },
  emptyText: { color: colors.textMuted, fontSize: 12, fontStyle: "italic", textAlign: "center", marginTop: spacing.xl },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.creamBorder, backgroundColor: colors.cream },
  input: { flex: 1, borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, backgroundColor: colors.creamLight, color: colors.navy, paddingHorizontal: spacing.md, paddingVertical: 10, maxHeight: 100 },
  sendButton: { backgroundColor: colors.navy, borderRadius: radii.card, paddingHorizontal: spacing.md, paddingVertical: 12 },
  sendLabel: { color: colors.gold, fontWeight: "600", fontSize: 12 },
  readOnlyBar: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.creamBorder, backgroundColor: colors.creamLight },
  readOnlyText: { color: colors.textMuted, fontSize: 11, textAlign: "center" },
});

const annonceStyles = StyleSheet.create({
  card: { backgroundColor: colors.creamLight, borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, padding: spacing.md, marginBottom: spacing.sm },
  cardDirection: { borderColor: colors.gold, borderWidth: 1.5, backgroundColor: "#FFF8E5" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  auteur: { color: colors.navy, fontFamily: typography.serif, fontSize: 14 },
  auteurDirection: { fontSize: 16, color: colors.navy },
  badge: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  badgeDirection: { borderColor: colors.gold, backgroundColor: colors.navy },
  badgeLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 0.4, color: colors.textMuted },
  badgeLabelDirection: { color: colors.gold },
  contenu: { color: colors.navy, fontSize: 14, lineHeight: 20 },
  date: { color: colors.textMuted, fontSize: 10, marginTop: spacing.sm },
});

const bubbleStyles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "flex-start", marginBottom: spacing.sm },
  rowMine: { justifyContent: "flex-end" },
  bubble: { maxWidth: "80%", backgroundColor: colors.creamLight, borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, padding: spacing.sm + 2 },
  bubbleMine: { backgroundColor: colors.navy, borderColor: colors.navy },
  auteur: { color: colors.gold, fontSize: 10, fontWeight: "700", marginBottom: 2 },
  contenu: { color: colors.navy, fontSize: 13 },
  contenuMine: { color: colors.cream },
  date: { color: colors.textMuted, fontSize: 9, marginTop: 4, textAlign: "right" },
  dateMine: { color: colors.creamBorder },
});
