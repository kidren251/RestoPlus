import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "@resto-plus/ui-luxury";
import { useSalleStore } from "../store/salleStore";

const STATUS_LABEL = {
  en_attente: "En attente",
  en_preparation: "En préparation",
  a_reclamer: "À réclamer",
  pret: "Plat prêt",
  servi: "Servi",
} as const;

export function CommandesCuisineScreen() {
  const commandes = useSalleStore((state) => state.commandes);
  const salle = useSalleStore((state) => state.salle);
  const serviceStates = useSalleStore((state) => state.serviceStates);
  const markDishReady = useSalleStore((state) => state.markDishReady);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>PASSE</Text>
      <Text style={styles.title}>Suivi des plats</Text>
      <Text style={styles.subtitle}>Visualiser les plats attendus et ceux prêts à être envoyés en salle.</Text>
      {Object.values(commandes).flatMap((commande) => commande.lignes.map((line) => {
        const table = salle?.tables.find((candidate) => candidate.id === commande.tableId);
        const service = serviceStates[commande.tableId];
        return (
        <View key={`${commande.tableId}-${line.id}`} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.table}>{table?.nom ?? commande.tableId}</Text>
            <Text style={styles.status}>{STATUS_LABEL[line.statut]}</Text>
          </View>
          <Text style={styles.client}>{service?.clientName ?? "Client non renseigné"}</Text>
          <Text style={styles.plat}>{line.quantite}× {line.nom}</Text>
          {line.statut === "a_reclamer" && (
            <Pressable style={styles.readyButton} onPress={() => markDishReady(commande.tableId, line.id)}>
              <Text style={styles.readyLabel}>Marquer le plat prêt</Text>
            </Pressable>
          )}
        </View>
        );
      }))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  eyebrow: { color: colors.gold, fontSize: 9, letterSpacing: 1.5, marginTop: spacing.md, marginBottom: spacing.sm },
  title: { color: colors.navy, fontFamily: typography.serif, fontSize: 25, marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: spacing.lg },
  card: { backgroundColor: colors.creamLight, borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, padding: spacing.md, marginBottom: spacing.sm },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  table: { color: colors.gold, fontFamily: typography.serif, fontSize: 14 },
  status: { color: colors.textMuted, fontSize: 10 },
  client: { color: colors.textMuted, fontSize: 11, marginBottom: 4 },
  plat: { color: colors.navy, fontSize: 14 },
  readyButton: { alignSelf: "flex-start", backgroundColor: colors.statusFree, borderRadius: radii.card, paddingHorizontal: spacing.sm, paddingVertical: 8, marginTop: spacing.sm },
  readyLabel: { color: "#FFFFFF", fontSize: 11, fontWeight: "600" },
});
