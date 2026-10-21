import React from "react";
import { View, Text, StyleSheet, Animated, Pressable } from "react-native";
import type { Table, TableServiceState } from "@resto-plus/types";
import { COLORS, couleurStatut } from "./couleurs";
import { labelCourse, labelDishStatus } from "./libelles";
import { useTableDrag } from "./useTableDrag";

interface TableItemProps {
  table: Table;
  scale: number;
  isAdmin: boolean;
  isSelected: boolean;
  onPress: () => void;
  onDragEnd: (x: number, y: number) => void;
  canvasSize: { w: number; h: number };
  serviceState?: TableServiceState;
}

/** Une table du plan : déplaçable en mode admin, simple bouton sinon. */
export function TableItem({ table, scale, isAdmin, isSelected, onPress, onDragEnd, canvasSize, serviceState }: TableItemProps) {
  const { pan, panHandlers } = useTableDrag({ table, scale, enabled: isAdmin, canvasSize, onPress, onDragEnd });

  const forme = table.forme;
  const borderRadius =
    forme === "ronde" ? Math.max(table.largeur, table.hauteur) * scale : forme === "carree" ? 6 : 4;
  const apparence = {
    width: table.largeur * scale,
    height: table.hauteur * scale,
    borderRadius,
    backgroundColor: couleurStatut(table.statut),
    borderColor: isSelected ? COLORS.blancCreme : COLORS.bleuNuit,
    borderWidth: isSelected ? 2 : 1,
  };

  if (isAdmin) {
    return (
      <Animated.View
        style={[
          styles.table,
          apparence,
          { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate: `${table.rotation}deg` }] },
        ]}
        {...panHandlers}
      >
        <TableContenu table={table} serviceState={serviceState} />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={{
        position: "absolute",
        transform: [{ translateX: pan.x }, { translateY: pan.y }],
      }}
    >
      <Pressable
        onPress={onPress}
        style={[styles.table, apparence, { transform: [{ rotate: `${table.rotation}deg` }], position: "relative" }]}
      >
        <TableContenu table={table} serviceState={serviceState} />
      </Pressable>
    </Animated.View>
  );
}

function TableContenu({ table, serviceState }: { table: Table; serviceState?: TableServiceState }) {
  return (
    <>
      <Text style={styles.tableLabel}>{table.nom ?? table.id}</Text>
      <Text style={styles.tableCapacite}>{table.capacite} pers.</Text>
      {serviceState && serviceState.course !== "aucun" && (
        <View style={styles.serviceMarker}>
          <Text style={styles.serviceMarkerText}>{labelCourse(serviceState.course)}</Text>
          {serviceState.dishStatus !== "aucun" && (
            <Text style={styles.serviceStatusText}>{labelDishStatus(serviceState.dishStatus)}</Text>
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  table: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tableLabel: {
    color: COLORS.blancCreme,
    fontWeight: "700",
    fontSize: 11,
  },
  tableCapacite: {
    color: COLORS.blancCreme,
    fontSize: 9,
    opacity: 0.85,
  },
  serviceMarker: {
    marginTop: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    backgroundColor: COLORS.blancCreme,
    alignItems: "center",
  },
  serviceMarkerText: { color: COLORS.bleuNuit, fontSize: 7, fontWeight: "700" },
  serviceStatusText: { color: COLORS.bleuNuit, fontSize: 6 },
});
