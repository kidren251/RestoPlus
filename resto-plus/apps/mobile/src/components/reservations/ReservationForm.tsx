import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal, TextInput, ScrollView } from "react-native";
import { colors, typography, radii, spacing } from "@resto-plus/ui-luxury";
import type { Table } from "@resto-plus/types";
import type { NouvelleReservation } from "../../store/reservationsStore";

/**
 * Nouvelle réservation. La table est facultative (attribuée à l'arrivée) ; les allergies
 * ne s'enregistrent que si le client les a signalées lui-même (docs/rgpd.md).
 */
export function ReservationForm({
  visible,
  tables,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  tables: Table[];
  onClose: () => void;
  onSubmit: (reservation: NouvelleReservation) => void;
}) {
  const [nomClient, setNomClient] = useState("");
  const [heure, setHeure] = useState("19:30");
  const [couverts, setCouverts] = useState("2");
  const [tableId, setTableId] = useState<string | undefined>(undefined);
  const [allergies, setAllergies] = useState("");
  const [signaleParClient, setSignaleParClient] = useState(false);
  const [notes, setNotes] = useState("");
  const [erreur, setErreur] = useState("");

  const reinitialiser = () => {
    setNomClient("");
    setCouverts("2");
    setTableId(undefined);
    setAllergies("");
    setSignaleParClient(false);
    setNotes("");
    setErreur("");
  };

  const valider = () => {
    const nombre = Number.parseInt(couverts, 10);
    const allergenes = allergies.split(",").map((a) => a.trim()).filter(Boolean);
    if (!nomClient.trim()) return setErreur("Indiquez le nom du client.");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(heure)) return setErreur("Heure au format 19:30.");
    if (!Number.isInteger(nombre) || nombre < 1) return setErreur("Nombre de couverts invalide.");
    if (allergenes.length > 0 && !signaleParClient) return setErreur("Cochez « signalées par le client » pour enregistrer des allergies.");
    onSubmit({
      nomClient: nomClient.trim(),
      heure,
      couverts: nombre,
      tableId,
      allergenes,
      allergenesSignalesAt: allergenes.length > 0 ? new Date().toISOString() : undefined,
      notes: notes.trim(),
    });
    reinitialiser();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Nouvelle réservation</Text>
            <Pressable onPress={onClose}><Text style={styles.close}>✕</Text></Pressable>
          </View>

          <Text style={styles.label}>Nom du client</Text>
          <TextInput style={styles.input} value={nomClient} onChangeText={setNomClient} placeholder="Nom" />

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>Heure</Text>
              <TextInput style={styles.input} value={heure} onChangeText={setHeure} keyboardType="numbers-and-punctuation" placeholder="19:30" />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>Couverts</Text>
              <TextInput style={styles.input} value={couverts} onChangeText={setCouverts} keyboardType="number-pad" />
            </View>
          </View>

          <Text style={styles.label}>Table <Text style={styles.optionnel}>(facultatif)</Text></Text>
          <View style={styles.pills}>
            <Pressable style={[styles.pill, !tableId && styles.pillOn]} onPress={() => setTableId(undefined)}>
              <Text style={[styles.pillLabel, !tableId && styles.pillLabelOn]}>À l'arrivée</Text>
            </Pressable>
            {tables.map((t) => (
              <Pressable key={t.id} style={[styles.pill, tableId === t.id && styles.pillOn]} onPress={() => setTableId(t.id)}>
                <Text style={[styles.pillLabel, tableId === t.id && styles.pillLabelOn]}>{t.nom ?? "Table"} · {t.capacite}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Allergies pour ce repas</Text>
          <TextInput style={styles.input} value={allergies} onChangeText={setAllergies} placeholder="Séparer par des virgules" />
          <Pressable style={styles.consent} onPress={() => setSignaleParClient((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: signaleParClient }}>
            <View style={[styles.checkbox, signaleParClient && styles.checkboxOn]}>
              {signaleParClient && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.consentText}>Signalées par le client lui-même, pour ce repas</Text>
          </Pressable>
          <Text style={styles.hint}>Non conservées : effacées à la fin du repas.</Text>

          <Text style={styles.label}>Note</Text>
          <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder="Optionnel" />

          {!!erreur && <Text style={styles.erreur}>{erreur}</Text>}
          <Pressable style={styles.submit} onPress={valider}><Text style={styles.submitLabel}>Ajouter</Text></Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(11,30,51,0.35)" },
  form: { backgroundColor: colors.cream, padding: spacing.lg, borderTopLeftRadius: radii.card, borderTopRightRadius: radii.card, maxHeight: "90%" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  title: { fontFamily: typography.serif, fontSize: 18, color: colors.navy },
  close: { color: colors.navy, fontSize: 16, padding: spacing.xs },
  label: { color: colors.textMuted, fontSize: 10, marginBottom: 4, marginTop: spacing.sm },
  optionnel: { fontSize: 9 },
  input: { borderWidth: 1, borderColor: colors.creamBorder, backgroundColor: colors.creamLight, borderRadius: radii.card, paddingHorizontal: spacing.sm, paddingVertical: 9, color: colors.navy },
  row: { flexDirection: "row", gap: spacing.sm },
  half: { flex: 1 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.creamLight },
  pillOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  pillLabel: { color: colors.navy, fontSize: 11 },
  pillLabelOn: { color: colors.gold, fontWeight: "600" },
  consent: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm },
  checkbox: { width: 18, height: 18, borderWidth: 1, borderColor: colors.navy, borderRadius: 4, alignItems: "center", justifyContent: "center", marginRight: spacing.sm },
  checkboxOn: { backgroundColor: colors.navy },
  checkmark: { color: colors.gold, fontSize: 11, fontWeight: "700" },
  consentText: { color: colors.navy, fontSize: 12, flex: 1 },
  hint: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
  erreur: { color: colors.statusOccupied, fontSize: 11, marginTop: spacing.sm },
  submit: { backgroundColor: colors.navy, borderRadius: radii.card, alignItems: "center", paddingVertical: 12, marginTop: spacing.lg, marginBottom: spacing.lg },
  submitLabel: { color: colors.gold, fontWeight: "600" },
});
