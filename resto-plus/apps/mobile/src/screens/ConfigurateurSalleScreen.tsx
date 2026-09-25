import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, spacing, typography } from "@resto-plus/ui-luxury";
import type { Table } from "@resto-plus/types";
import { useSalleStore } from "../store/salleStore";

export function ConfigurateurSalleScreen({ onBack }: { onBack: () => void }) {
  const salle = useSalleStore((state) => state.salle);
  const updateSalleConfiguration = useSalleStore((state) => state.updateSalleConfiguration);
  const addTable = useSalleStore((state) => state.addTable);
  const removeTable = useSalleStore((state) => state.removeTable);
  const [nom, setNom] = useState("");
  const [largeur, setLargeur] = useState("");
  const [hauteur, setHauteur] = useState("");
  const [tableNom, setTableNom] = useState("");
  const [capacite, setCapacite] = useState("2");
  const [forme, setForme] = useState<Table["forme"]>("ronde");

  useEffect(() => {
    if (salle) {
      setNom(salle.nom);
      setLargeur(String(salle.largeurCanvas));
      setHauteur(String(salle.hauteurCanvas));
    }
  }, [salle?.id]);

  if (!salle) {
    return <View style={styles.empty}><Text style={styles.emptyLabel}>Aucune salle chargée.</Text></View>;
  }

  const enregistrerSalle = () => {
    const width = Number.parseInt(largeur, 10);
    const height = Number.parseInt(hauteur, 10);
    if (!nom.trim() || !Number.isInteger(width) || width < 160 || !Number.isInteger(height) || height < 160) return;
    updateSalleConfiguration({ nom: nom.trim(), largeurCanvas: width, hauteurCanvas: height });
  };

  const creerTable = () => {
    const seats = Number.parseInt(capacite, 10);
    if (!Number.isInteger(seats) || seats < 1) return;
    addTable({ nom: tableNom, capacite: seats, forme });
    setTableNom("");
    setCapacite("2");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>MODE CRÉATEUR / PROGRAMMEUR</Text>
      <Text style={styles.title}>Configurer la salle</Text>
      <Text style={styles.subtitle}>Préparer un plan précis pour chaque établissement avant sa mise en service.</Text>

      <Text style={styles.sectionTitle}>Identité et dimensions</Text>
      <Text style={styles.label}>Nom de la salle</Text>
      <TextInput style={styles.input} value={nom} onChangeText={setNom} placeholder="Salle principale" />
      <View style={styles.row}>
        <View style={styles.half}><Text style={styles.label}>Largeur</Text><TextInput style={styles.input} value={largeur} onChangeText={setLargeur} keyboardType="number-pad" /></View>
        <View style={styles.half}><Text style={styles.label}>Hauteur</Text><TextInput style={styles.input} value={hauteur} onChangeText={setHauteur} keyboardType="number-pad" /></View>
      </View>
      <Pressable style={styles.primaryButton} onPress={enregistrerSalle}><Text style={styles.primaryLabel}>Enregistrer la configuration</Text></Pressable>

      <Text style={styles.sectionTitle}>Ajouter une table</Text>
      <TextInput style={styles.input} value={tableNom} onChangeText={setTableNom} placeholder="Nom de la table" />
      <View style={styles.row}>
        <View style={styles.half}><Text style={styles.label}>Capacité</Text><TextInput style={styles.input} value={capacite} onChangeText={setCapacite} keyboardType="number-pad" /></View>
        <View style={styles.half}>
          <Text style={styles.label}>Forme</Text>
          <View style={styles.choiceRow}>
            {(["ronde", "carree", "rectangle"] as const).map((option) => (
              <Pressable key={option} style={[styles.choice, forme === option && styles.choiceActive]} onPress={() => setForme(option)}>
                <Text style={[styles.choiceLabel, forme === option && styles.choiceLabelActive]}>{option}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <Pressable style={styles.secondaryButton} onPress={creerTable}><Text style={styles.secondaryLabel}>Ajouter la table</Text></Pressable>

      <Text style={styles.sectionTitle}>Tables configurées · {salle.tables.length}</Text>
      {salle.tables.map((table) => (
        <View key={table.id} style={styles.tableRow}>
          <View style={styles.tableInfo}>
            <Text style={styles.tableName}>{table.nom ?? table.id}</Text>
            <Text style={styles.tableMeta}>{table.capacite} personnes · {table.forme}</Text>
          </View>
          <Pressable onPress={() => removeTable(table.id)} style={styles.deleteButton}>
            <Text style={styles.deleteLabel}>Supprimer</Text>
          </Pressable>
        </View>
      ))}

      <Pressable style={styles.backButton} onPress={onBack}><Text style={styles.backLabel}>Retour au plan</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  emptyLabel: { color: colors.textMuted },
  eyebrow: { color: colors.gold, fontSize: 9, letterSpacing: 1.5, marginBottom: spacing.sm },
  title: { color: colors.navy, fontFamily: typography.serif, fontSize: 25, marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: spacing.xl },
  sectionTitle: { color: colors.navy, fontFamily: typography.serif, fontSize: 16, marginTop: spacing.xl, marginBottom: spacing.sm },
  label: { color: colors.textMuted, fontSize: 10, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, backgroundColor: colors.creamLight, color: colors.navy, paddingHorizontal: spacing.sm, paddingVertical: 10 },
  row: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  half: { flex: 1 },
  primaryButton: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radii.card, paddingVertical: 12, marginTop: spacing.md },
  primaryLabel: { color: colors.gold, fontWeight: "600" },
  secondaryButton: { alignItems: "center", backgroundColor: colors.gold, borderRadius: radii.card, paddingVertical: 12, marginTop: spacing.md },
  secondaryLabel: { color: colors.navy, fontWeight: "600" },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  choice: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 7, backgroundColor: colors.creamLight },
  choiceActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  choiceLabel: { color: colors.navy, fontSize: 9 },
  choiceLabelActive: { color: colors.gold },
  tableRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.creamBorder, paddingVertical: spacing.sm },
  tableInfo: { flex: 1 },
  tableName: { color: colors.navy, fontSize: 13 },
  tableMeta: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  deleteButton: { padding: spacing.sm },
  deleteLabel: { color: colors.statusOccupied, fontSize: 10 },
  backButton: { alignItems: "center", paddingVertical: spacing.lg },
  backLabel: { color: colors.textMuted, textDecorationLine: "underline", fontSize: 11 },
});
