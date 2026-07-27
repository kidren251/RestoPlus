import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { colors, typography, radii, spacing } from "@resto-plus/ui-luxury";

interface AccueilScreenProps {
  prenomUtilisateur: string;
  nomEtablissement: string;
  espaceActif: "operationnel" | "academie";
  onChangerEspace: (espace: "operationnel" | "academie") => void;
  onNaviguer: (destination: string) => void;
  checklistsEnAttente: number;
  arriveesVip: number;
}

const ACCES_RAPIDES = [
  { id: "plan_salle", label: "Plan de salle", numero: "01" },
  { id: "checklists", label: "Checklists HACCP", numero: "02" },
  { id: "fiches_vip", label: "Fiches VIP du jour", numero: "03" },
] as const;

export function AccueilScreen({
  prenomUtilisateur,
  nomEtablissement,
  espaceActif,
  onChangerEspace,
  onNaviguer,
  checklistsEnAttente,
  arriveesVip,
}: AccueilScreenProps) {
  const badges: Record<string, string | undefined> = {
    checklists: checklistsEnAttente > 0 ? `${checklistsEnAttente} en attente` : undefined,
    fiches_vip: arriveesVip > 0 ? `${arriveesVip} arrivées` : undefined,
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.seal}>
          <Text style={styles.sealIcon}>◆</Text>
        </View>
        <Text style={styles.brand}>{nomEtablissement}</Text>
        <Text style={styles.wordmark}>P A L A C E O S</Text>
      </View>

      <View style={styles.tabs}>
        <Pressable onPress={() => onChangerEspace("operationnel")} style={styles.tab}>
          <Text style={[styles.tabLabel, espaceActif === "operationnel" && styles.tabLabelActive]}>
            Opérationnel
          </Text>
          <View style={[styles.tabUnderline, espaceActif === "operationnel" && styles.tabUnderlineActive]} />
        </Pressable>
        <Pressable onPress={() => onChangerEspace("academie")} style={styles.tab}>
          <Text style={[styles.tabLabel, espaceActif === "academie" && styles.tabLabelActive]}>
            Académie
          </Text>
          <View style={[styles.tabUnderline, espaceActif === "academie" && styles.tabUnderlineActive]} />
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>CE SOIR</Text>

      <View>
        {ACCES_RAPIDES.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onNaviguer(item.id)}
            style={styles.row}
          >
            <Text style={styles.rowNumero}>{item.numero}</Text>
            <Text style={styles.rowLabel}>{item.label}</Text>
            {badges[item.id] && <Text style={styles.rowBadge}>{badges[item.id]}</Text>}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  seal: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm + 6,
  },
  sealIcon: {
    color: colors.gold,
    fontSize: 13,
  },
  brand: {
    fontFamily: typography.serif,
    fontSize: 20,
    color: colors.navy,
    letterSpacing: 0.5,
  },
  wordmark: {
    fontSize: 9,
    letterSpacing: typography.tracking.brand,
    color: colors.gold,
    marginTop: spacing.xs + 2,
  },
  tabs: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  tab: {
    alignItems: "center",
    paddingBottom: 9,
  },
  tabLabel: {
    fontFamily: typography.serif,
    fontSize: 14,
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.navy,
  },
  tabUnderline: {
    height: 1,
    width: "100%",
    marginTop: 9,
    backgroundColor: "transparent",
  },
  tabUnderlineActive: {
    backgroundColor: colors.gold,
  },
  sectionLabel: {
    fontSize: 9,
    letterSpacing: typography.tracking.label,
    color: colors.gold,
    marginBottom: spacing.sm - 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.creamBorder,
  },
  rowNumero: {
    fontFamily: typography.serif,
    fontSize: 12,
    color: colors.gold,
  },
  rowLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.navy,
  },
  rowBadge: {
    fontSize: 10,
    color: colors.textMuted,
  },
});
