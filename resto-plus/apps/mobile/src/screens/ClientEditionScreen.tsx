import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, spacing, typography } from "@resto-plus/ui-luxury";
import { useSalleStore } from "../store/salleStore";

export function ClientEditionScreen({
  tableId,
  onBack,
}: {
  tableId: string;
  onBack: () => void;
}) {
  const service = useSalleStore((state) => state.serviceStates[tableId]);
  const saveClient = useSalleStore((state) => state.saveClient);
  const sendAddition = useSalleStore((state) => state.sendAddition);
  const [nom, setNom] = useState(service?.client?.nom ?? service?.clientName ?? "");
  const [telephone, setTelephone] = useState(service?.client?.telephone ?? "");
  const [allergies, setAllergies] = useState(service?.client?.allergies?.join(", ") ?? "");
  const [notes, setNotes] = useState(service?.client?.notes ?? "");

  const enregistrer = () => {
    if (!nom.trim()) return;
    saveClient(tableId, {
      nom: nom.trim(),
      telephone: telephone.trim(),
      allergies: allergies.split(",").map((value) => value.trim()).filter(Boolean),
      notes: notes.trim(),
    });
  };

  const envoyerAddition = () => {
    enregistrer();
    sendAddition(tableId);
    onBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>TABLE {tableId.replace("t", "")}</Text>
      <Text style={styles.title}>Édition client</Text>
      <Text style={styles.subtitle}>Créer ou compléter la fiche du client installé à cette table.</Text>

      <Text style={styles.label}>Nom du client</Text>
      <TextInput style={styles.input} value={nom} onChangeText={setNom} placeholder="M. ou Mme Nom" />

      <Text style={styles.label}>Téléphone</Text>
      <TextInput style={styles.input} value={telephone} onChangeText={setTelephone} keyboardType="phone-pad" placeholder="Optionnel" />

      <Text style={styles.label}>Allergies</Text>
      <TextInput style={styles.input} value={allergies} onChangeText={setAllergies} placeholder="Séparer par des virgules" />

      <Text style={styles.label}>Notes client</Text>
      <TextInput style={[styles.input, styles.notesInput]} value={notes} onChangeText={setNotes} multiline placeholder="Préférences, occasion, attention particulière..." />

      <Pressable style={styles.saveButton} onPress={enregistrer}>
        <Text style={styles.saveLabel}>Enregistrer la fiche</Text>
      </Pressable>
      <Pressable style={styles.billButton} onPress={envoyerAddition}>
        <Text style={styles.billLabel}>Envoyer l’addition</Text>
      </Pressable>
      <Pressable style={styles.backButton} onPress={onBack}>
        <Text style={styles.backLabel}>Retour au plan de salle</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  eyebrow: { color: colors.gold, fontSize: 9, letterSpacing: 1.5, marginBottom: spacing.sm },
  title: { color: colors.navy, fontFamily: typography.serif, fontSize: 25, marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: spacing.lg },
  label: { color: colors.textMuted, fontSize: 10, marginTop: spacing.md, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, backgroundColor: colors.creamLight, color: colors.navy, paddingHorizontal: spacing.md, paddingVertical: 11 },
  notesInput: { minHeight: 86, textAlignVertical: "top" },
  saveButton: { backgroundColor: colors.navy, borderRadius: radii.card, alignItems: "center", paddingVertical: 13, marginTop: spacing.xl },
  saveLabel: { color: colors.gold, fontWeight: "600" },
  billButton: { backgroundColor: colors.statusOccupied, borderRadius: radii.card, alignItems: "center", paddingVertical: 13, marginTop: spacing.sm },
  billLabel: { color: "#FFFFFF", fontWeight: "600" },
  backButton: { alignItems: "center", paddingVertical: spacing.md, marginTop: spacing.sm },
  backLabel: { color: colors.textMuted, fontSize: 11, textDecorationLine: "underline" },
});
