import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { StatutTable } from "@resto-plus/types";
import { COLORS, couleurStatut } from "./couleurs";

const ITEMS: { statut: StatutTable; label: string }[] = [
  { statut: "libre", label: "Libre" },
  { statut: "occupee", label: "Occupée" },
  { statut: "reservee", label: "Réservée" },
  { statut: "a_nettoyer", label: "À nettoyer" },
];

export function Legende() {
  return (
    <View style={styles.legende}>
      {ITEMS.map((it) => (
        <View key={it.statut} style={styles.legendeItem}>
          <View style={[styles.legendePastille, { backgroundColor: couleurStatut(it.statut) }]} />
          <Text style={styles.legendeLabel}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  legende: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 14,
    gap: 12,
  },
  legendeItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  legendePastille: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendeLabel: {
    color: COLORS.blancCreme,
    fontSize: 11,
  },
});
