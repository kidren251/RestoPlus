import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { colors, radii, spacing, typography } from "@resto-plus/ui-luxury";
import type { Pole } from "@resto-plus/types";
import { api } from "../api/client";

export function InviterEquipierScreen({ onBack, onOpenScanner }: { onBack: () => void; onOpenScanner: () => void }) {
  const [durationHours, setDurationHours] = useState(48);
  const [pole, setPole] = useState<Extract<Pole, "salle" | "cuisine">>("salle");
  const [invitation, setInvitation] = useState<{ token: string; expiresAt: string; pole: Pole } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await api.post<{ token: string; expiresAt: string; pole: Pole }>("/invitations", { durationHours, pole });
      setInvitation(result);
    } catch {
      setError("Impossible de créer l’invitation. Vérifie que le téléphone utilise la même API que celui qui scannera le code.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>ÉQUIPE TEMPORAIRE</Text>
        <Text style={styles.title}>Inviter un équipier</Text>
        <Text style={styles.subtitle}>L’accès sera limité au rôle serveur et à cet univers restaurant.</Text>

        {!invitation ? (
          <>
            <Text style={styles.label}>Pôle de l’équipier</Text>
            <View style={styles.durationRow}>
              {(["salle", "cuisine"] as const).map((candidate) => (
                <Pressable key={candidate} style={[styles.duration, pole === candidate && styles.durationActive]} onPress={() => setPole(candidate)}>
                  <Text style={[styles.durationLabel, pole === candidate && styles.durationLabelActive]}>{candidate === "salle" ? "Salle" : "Cuisine"}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Durée de l’accès</Text>
            <View style={styles.durationRow}>
              {[24, 48, 72].map((hours) => (
                <Pressable key={hours} style={[styles.duration, durationHours === hours && styles.durationActive]} onPress={() => setDurationHours(hours)}>
                  <Text style={[styles.durationLabel, durationHours === hours && styles.durationLabelActive]}>{hours} h</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.primaryButton} onPress={() => void generate()} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color={colors.gold} /> : <Text style={styles.primaryLabel}>Générer le QR code</Text>}
            </Pressable>
            {!!error && <Text style={styles.error}>{error}</Text>}
          </>
        ) : (
          <View style={styles.qrBlock}>
            <QRCode value={`resto-plus://join/${invitation.token}`} size={210} backgroundColor={colors.creamLight} color={colors.navy} />
            <Text style={styles.qrHint}>À scanner depuis l’application Restau Plus</Text>
            <Text style={styles.expiry}>Expire le {new Date(invitation.expiresAt).toLocaleString("fr-FR")}</Text>
            <Text style={styles.role}>Accès accordé : {invitation.pole === "cuisine" ? "cuisine" : "salle"} · serveur · niveau-0 · usage unique</Text>
            <Pressable style={styles.secondaryButton} onPress={() => setInvitation(null)}><Text style={styles.secondaryLabel}>Générer une nouvelle invitation</Text></Pressable>
          </View>
        )}

        <Pressable style={styles.scanButton} onPress={onOpenScanner}><Text style={styles.scanLabel}>Scanner une invitation</Text></Pressable>
        <Pressable style={styles.backButton} onPress={onBack}><Text style={styles.backLabel}>Retour</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, alignItems: "stretch" },
  eyebrow: { color: colors.gold, fontSize: 9, letterSpacing: 1.5, marginTop: spacing.md, marginBottom: spacing.sm },
  title: { color: colors.navy, fontFamily: typography.serif, fontSize: 25, marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: spacing.xl },
  label: { color: colors.textMuted, fontSize: 10, marginBottom: spacing.sm },
  durationRow: { flexDirection: "row", gap: spacing.sm },
  duration: { flex: 1, alignItems: "center", borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, paddingVertical: 11 },
  durationActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  durationLabel: { color: colors.navy, fontSize: 12 },
  durationLabelActive: { color: colors.gold },
  primaryButton: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radii.card, paddingVertical: 13, marginTop: spacing.lg },
  primaryLabel: { color: colors.gold, fontWeight: "600" },
  error: { color: colors.statusOccupied, fontSize: 11, lineHeight: 16, marginTop: spacing.md, textAlign: "center" },
  qrBlock: { alignItems: "center", backgroundColor: colors.creamLight, borderRadius: radii.card, padding: spacing.lg },
  qrHint: { color: colors.navy, fontSize: 12, textAlign: "center", marginTop: spacing.md },
  expiry: { color: colors.textMuted, fontSize: 10, textAlign: "center", marginTop: spacing.sm },
  role: { color: colors.gold, fontSize: 10, textAlign: "center", marginTop: spacing.sm },
  secondaryButton: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, paddingVertical: 10, paddingHorizontal: spacing.md, marginTop: spacing.md },
  secondaryLabel: { color: colors.navy, fontSize: 11 },
  scanButton: { alignItems: "center", paddingVertical: spacing.lg },
  scanLabel: { color: colors.navy, fontSize: 12, textDecorationLine: "underline" },
  backButton: { alignItems: "center", paddingVertical: spacing.sm },
  backLabel: { color: colors.textMuted, fontSize: 11 },
});
