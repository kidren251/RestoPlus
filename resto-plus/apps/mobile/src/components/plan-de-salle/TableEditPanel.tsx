import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Pressable, TextInput } from "react-native";
import type { Table, TableServiceState } from "@resto-plus/types";
import { COLORS, PANEL_WIDTH } from "./couleurs";
import { panelStyles } from "./panelStyles";
import { useTableEdition } from "./useTableEdition";
import { SuiviDiner } from "./SuiviDiner";
import { CommandeEnCours } from "./CommandeEnCours";

interface TableEditPanelProps {
  table: Table | undefined;
  serviceState?: TableServiceState;
  canEditService: boolean;
  canEditLayout: boolean;
  canRequestDish: boolean;
  onClientPress?: (tableId: string) => void;
  visible: boolean;
  onClose: () => void;
}

/** Panneau latéral d'une table : fiche client, suivi du dîner, nom/capacité (admin), commande. */
export function TableEditPanel({ table, serviceState, canEditService, canEditLayout, canRequestDish, onClientPress, visible, onClose }: TableEditPanelProps) {
  const translateX = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const edition = useTableEdition(table);

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : PANEL_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, translateX]);

  if (!table) {
    // On garde le panneau monté (juste hors-écran) pour l'animation, mais rien à afficher
    return (
      <Animated.View
        pointerEvents="none"
        style={[styles.panel, { transform: [{ translateX }] }]}
      />
    );
  }

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[styles.panel, { transform: [{ translateX }] }]}
    >
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Édition table</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={styles.panelClose}>✕</Text>
        </Pressable>
      </View>

      {onClientPress && (
        <Pressable style={styles.clientButton} onPress={() => onClientPress(table.id)}>
          <Text style={styles.clientButtonLabel}>Ouvrir la fiche client</Text>
        </Pressable>
      )}

      {canEditService && <SuiviDiner tableId={table.id} serviceState={serviceState} />}

      {canEditLayout && (
        <>
          <Text style={panelStyles.panelLabel}>Nom de la table</Text>
          <TextInput
            style={styles.panelInput}
            value={edition.nomDraft}
            onChangeText={edition.setNomDraft}
            onBlur={edition.enregistrerNom}
            onSubmitEditing={edition.enregistrerNom}
            placeholder="Nom de la table"
            placeholderTextColor="#8A8A8A"
          />

          <Text style={panelStyles.panelLabel}>Capacité (nombre de personnes)</Text>
          <View style={styles.capaciteRow}>
            <Pressable style={styles.capaciteBtn} onPress={() => edition.ajusterCapacite(-1)}>
              <Text style={styles.capaciteBtnLabel}>−</Text>
            </Pressable>
            <TextInput
              style={styles.capaciteInput}
              value={edition.capaciteDraft}
              onChangeText={edition.setCapaciteDraft}
              onBlur={edition.enregistrerCapacite}
              onSubmitEditing={edition.enregistrerCapacite}
              keyboardType="number-pad"
            />
            <Pressable style={styles.capaciteBtn} onPress={() => edition.ajusterCapacite(1)}>
              <Text style={styles.capaciteBtnLabel}>+</Text>
            </Pressable>
          </View>
        </>
      )}

      <View style={panelStyles.panelDivider} />

      <CommandeEnCours tableId={table.id} canRequestDish={canRequestDish} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    backgroundColor: COLORS.blancCreme,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.or,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: -2, height: 0 },
    elevation: 6,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.bleuNuit,
  },
  panelClose: {
    fontSize: 16,
    color: COLORS.bleuNuit,
    padding: 4,
  },
  clientButton: {
    backgroundColor: COLORS.bleuNuit,
    borderRadius: 6,
    alignItems: "center",
    paddingVertical: 11,
    marginBottom: 6,
  },
  clientButtonLabel: { color: COLORS.or, fontSize: 12, fontWeight: "600" },
  panelInput: {
    borderWidth: 1,
    borderColor: "#C9BFA8",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.bleuNuit,
    backgroundColor: "#FFFDF8",
  },
  capaciteRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  capaciteBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#C9BFA8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFDF8",
  },
  capaciteBtnLabel: {
    fontSize: 18,
    color: COLORS.bleuNuit,
  },
  capaciteInput: {
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: "#C9BFA8",
    borderRadius: 6,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.bleuNuit,
    backgroundColor: "#FFFDF8",
  },
});
