import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { COLORS } from "./couleurs";

/** Barre d'administration du plan (N2+) : verrou des tables et accès au configurateur. */
export function AdminToolbar({ layoutLocked, onToggleLayoutLock, onOpenConfigurator }: { layoutLocked: boolean; onToggleLayoutLock?: () => void; onOpenConfigurator?: () => void }) {
  return (
    <View style={styles.adminToolbar}>
      <View style={styles.adminToolbarCopy}>
        <Text style={styles.adminToolbarEyebrow}>ADMINISTRATION DU PLAN</Text>
        <Text style={styles.adminToolbarHint}>
          {layoutLocked ? "Plan verrouillé · les tables ne bougent plus" : "Mode édition · déplacez les tables"}
        </Text>
      </View>
      <View style={styles.adminToolbarActions}>
        <Pressable style={[styles.adminToolButton, layoutLocked && styles.adminToolButtonActive]} onPress={onToggleLayoutLock}>
          <Text style={[styles.adminToolLabel, layoutLocked && styles.adminToolLabelActive]}>{layoutLocked ? "Déverrouiller" : "Verrouiller"}</Text>
        </Pressable>
        <Pressable style={[styles.adminToolButton, styles.adminToolButtonPrimary]} onPress={onOpenConfigurator}>
          <Text style={styles.adminToolLabelPrimary}>Configurer</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  adminToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#19324D",
    borderWidth: 1,
    borderColor: "#38516B",
  },
  adminToolbarCopy: { flex: 1 },
  adminToolbarEyebrow: {
    color: COLORS.or,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.7,
  },
  adminToolbarHint: {
    color: COLORS.blancCreme,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3,
    opacity: 0.78,
  },
  adminToolbarActions: { gap: 6 },
  adminToolButton: {
    minWidth: 108,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#60748A",
    borderRadius: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  adminToolButtonActive: { borderColor: COLORS.or, backgroundColor: "#263D55" },
  adminToolButtonPrimary: { borderColor: COLORS.or, backgroundColor: COLORS.or },
  adminToolLabel: { color: COLORS.blancCreme, fontSize: 10, fontWeight: "700" },
  adminToolLabelActive: { color: COLORS.or },
  adminToolLabelPrimary: { color: COLORS.bleuNuit, fontSize: 10, fontWeight: "700" },
});
