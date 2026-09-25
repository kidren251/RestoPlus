import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, spacing, typography } from "@resto-plus/ui-luxury";
import type { Conversation, Destinataire, Pole } from "@resto-plus/types";
import { useMessagingStore } from "../store/messagingStore";
import { useSessionStore } from "../store/sessionStore";

const REFRESH_MS = 8_000;

export function MessagerieScreen({ onOpenConversation }: { onOpenConversation: (conversationId: string, titre: string) => void }) {
  const currentUser = useSessionStore((state) => state.currentUser);
  const conversations = useMessagingStore((state) => state.conversations);
  const loadConversations = useMessagingStore((state) => state.loadConversations);
  const demarrerDM = useMessagingStore((state) => state.demarrerDM);
  const creerCanal = useMessagingStore((state) => state.creerCanal);
  const destinataires = useMessagingStore((state) => state.destinataires);
  const loadDestinataires = useMessagingStore((state) => state.loadDestinataires);
  const accesRefuse = useMessagingStore((state) => state.accesRefuse);

  const [showNewCanal, setShowNewCanal] = useState(false);
  const [canalNom, setCanalNom] = useState("");
  const [canalPole, setCanalPole] = useState<Pole>("salle");

  useEffect(() => {
    loadConversations();
    loadDestinataires();
    const interval = setInterval(() => {
      loadConversations();
      loadDestinataires();
    }, REFRESH_MS);
    return () => clearInterval(interval);
  }, [loadConversations, loadDestinataires]);

  if (!currentUser) return null;

  if (accesRefuse) {
    return (
      <View style={[styles.container, styles.refuse]}>
        <Text style={styles.title}>Messagerie</Text>
        <Text style={styles.subtitle}>{accesRefuse}</Text>
      </View>
    );
  }

  const annonces = conversations.filter((c) => c.type === "annonce");
  const canaux = conversations.filter((c) => c.type === "canal");
  const dms = conversations.filter((c) => c.type === "dm");

  // Le nom du DM est fourni par l'API (annuaire du restaurant).
  const titreDM = (dm: Conversation) => dm.nom ?? "Conversation";

  // Annuaire filtré par l'API : hiérarchie respectée et accès messagerie ouvert par le N3.
  const partenairesPossibles = destinataires.filter(
    (destinataire) => !dms.some((dm) => dm.participantIds?.includes(destinataire.id))
  );

  const ouvrirDM = async (target: Destinataire) => {
    const conversation = await demarrerDM(target);
    if (conversation) onOpenConversation(conversation.id, target.nom);
  };

  const soumettreCanal = async () => {
    if (!canalNom.trim()) return;
    const conversation = await creerCanal(canalNom.trim(), canalPole);
    if (conversation) {
      setCanalNom("");
      setShowNewCanal(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>ÉTABLISSEMENT</Text>
      <Text style={styles.title}>Messagerie</Text>
      <Text style={styles.subtitle}>Tableau d'affichage, canaux d'équipe et messages directs.</Text>

      <Text style={styles.sectionLabel}>TABLEAU D'AFFICHAGE</Text>
      <View style={styles.list}>
        {annonces.map((conversation) => (
          <Pressable
            key={conversation.id}
            onPress={() => onOpenConversation(conversation.id, conversation.nom ?? "Général")}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Text style={styles.rowIcon}>📌</Text>
            <Text style={styles.rowLabel}>{conversation.nom}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>CANAUX</Text>
      <View style={styles.list}>
        {canaux.map((conversation) => (
          <Pressable
            key={conversation.id}
            onPress={() => onOpenConversation(conversation.id, conversation.nom ?? "Canal")}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Text style={styles.rowIcon}>#</Text>
            <Text style={styles.rowLabel}>{conversation.nom}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>
      {currentUser.accessRole === "directeur_admin" && (
        <>
          {showNewCanal ? (
            <View style={styles.form}>
              <Text style={styles.label}>Nom du canal</Text>
              <TextInput style={styles.input} value={canalNom} onChangeText={setCanalNom} placeholder="Ex : Événements" />
              <Text style={styles.label}>Pôle</Text>
              <View style={styles.poleRow}>
                {(["salle", "cuisine"] as const).map((candidate) => (
                  <Pressable key={candidate} onPress={() => setCanalPole(candidate)} style={[styles.polePill, canalPole === candidate && styles.polePillActive]}>
                    <Text style={[styles.polePillLabel, canalPole === candidate && styles.polePillLabelActive]}>{candidate === "salle" ? "Salle" : "Cuisine"}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={styles.saveButton} onPress={soumettreCanal}>
                <Text style={styles.saveLabel}>Créer le canal</Text>
              </Pressable>
              <Pressable style={styles.cancelButton} onPress={() => setShowNewCanal(false)}>
                <Text style={styles.cancelLabel}>Annuler</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.addButton} onPress={() => setShowNewCanal(true)}>
              <Text style={styles.addLabel}>＋ Créer un canal</Text>
            </Pressable>
          )}
        </>
      )}

      <Text style={styles.sectionLabel}>MESSAGES DIRECTS</Text>
      <View style={styles.list}>
        {dms.length === 0 ? (
          <Text style={styles.emptyText}>Aucun message direct pour l'instant.</Text>
        ) : (
          dms.map((conversation) => (
            <Pressable
              key={conversation.id}
              onPress={() => onOpenConversation(conversation.id, titreDM(conversation))}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <Text style={styles.rowIcon}>●</Text>
              <Text style={styles.rowLabel}>{titreDM(conversation)}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))
        )}
      </View>
      {partenairesPossibles.length > 0 && (
        <>
          <Text style={styles.pickerHint}>Nouveau message à :</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
            {partenairesPossibles.map((account) => (
              <Pressable key={account.id} onPress={() => void ouvrirDM(account)} style={styles.pickerPill}>
                <Text style={styles.pickerPillLabel}>{account.nom}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  refuse: { padding: spacing.xl, justifyContent: "center" },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  eyebrow: { color: colors.gold, fontSize: 9, letterSpacing: 1.5, marginTop: spacing.md, marginBottom: spacing.sm },
  title: { color: colors.navy, fontFamily: typography.serif, fontSize: 25, marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: spacing.lg },
  sectionLabel: { color: colors.gold, fontSize: 9, letterSpacing: typography.tracking.label, marginTop: spacing.lg, marginBottom: spacing.sm },
  list: { borderTopWidth: 1, borderTopColor: colors.creamBorder },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.creamBorder },
  rowPressed: { opacity: 0.6 },
  rowIcon: { color: colors.gold, fontSize: 14, width: 18, textAlign: "center" },
  rowLabel: { flex: 1, color: colors.navy, fontSize: 14 },
  chevron: { color: colors.creamBorder, fontSize: 20 },
  emptyText: { color: colors.textMuted, fontSize: 12, fontStyle: "italic", paddingVertical: spacing.md },
  addButton: { alignItems: "center", paddingVertical: spacing.md, marginTop: spacing.md, borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card },
  addLabel: { color: colors.gold, fontWeight: "600" },
  form: { marginTop: spacing.md, borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, padding: spacing.md, backgroundColor: colors.creamLight },
  label: { color: colors.textMuted, fontSize: 10, marginTop: spacing.sm, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, backgroundColor: colors.cream, color: colors.navy, paddingHorizontal: spacing.md, paddingVertical: 11 },
  poleRow: { flexDirection: "row", gap: spacing.xs },
  polePill: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  polePillActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  polePillLabel: { color: colors.textMuted, fontSize: 12 },
  polePillLabelActive: { color: colors.gold },
  saveButton: { backgroundColor: colors.navy, borderRadius: radii.card, alignItems: "center", paddingVertical: 12, marginTop: spacing.md },
  saveLabel: { color: colors.gold, fontWeight: "600" },
  cancelButton: { alignItems: "center", paddingVertical: spacing.sm },
  cancelLabel: { color: colors.textMuted, fontSize: 11, textDecorationLine: "underline" },
  pickerHint: { color: colors.textMuted, fontSize: 10, marginTop: spacing.md, marginBottom: spacing.xs },
  pickerRow: { flexDirection: "row" },
  pickerPill: { borderWidth: 1, borderColor: colors.gold, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 7, marginRight: spacing.xs },
  pickerPillLabel: { color: colors.navy, fontSize: 11 },
});
