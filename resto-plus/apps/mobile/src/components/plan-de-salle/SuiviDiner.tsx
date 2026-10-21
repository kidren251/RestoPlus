import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import type { TableServiceState } from "@resto-plus/types";
import { useSalleStore } from "../../store/salleStore";
import { COLORS } from "./couleurs";
import { labelCourse, labelDishStatus } from "./libelles";
import { panelStyles } from "./panelStyles";

/** Section « Suivi du dîner » du panneau : étape du repas et état du plat (droit service.suivre). */
export function SuiviDiner({ tableId, serviceState }: { tableId: string; serviceState?: TableServiceState }) {
  const updateTableService = useSalleStore((s) => s.updateTableService);
  const currentService = serviceState ?? { tableId, course: "aucun" as const, dishStatus: "aucun" as const };

  return (
    <>
      <Text style={panelStyles.panelSectionTitle}>Suivi du dîner</Text>
      {currentService.clientName && (
        <Text style={styles.serviceClient}>{currentService.clientName}</Text>
      )}
      <Text style={panelStyles.panelLabel}>Étape du repas</Text>
      <View style={styles.choiceRow}>
        {(["aucun", "entree", "plat", "dessert"] as const).map((course) => (
          <Pressable
            key={course}
            style={[styles.choiceButton, currentService.course === course && styles.choiceButtonActive]}
            onPress={() => updateTableService(tableId, { course })}
          >
            <Text style={[styles.choiceLabel, currentService.course === course && styles.choiceLabelActive]}>
              {course === "aucun" ? "—" : labelCourse(course)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={panelStyles.panelLabel}>État du plat</Text>
      <View style={styles.choiceRow}>
        {(["aucun", "a_reclamer", "servi"] as const).map((dishStatus) => (
          <Pressable
            key={dishStatus}
            style={[styles.choiceButton, currentService.dishStatus === dishStatus && styles.choiceButtonActive]}
            onPress={() => updateTableService(tableId, { dishStatus })}
          >
            <Text style={[styles.choiceLabel, currentService.dishStatus === dishStatus && styles.choiceLabelActive]}>
              {dishStatus === "aucun" ? "—" : labelDishStatus(dishStatus)}
            </Text>
          </Pressable>
        ))}
      </View>
      {currentService.lastEventAt && (
        <Text style={styles.serviceTimestamp}>
          Dernière mise à jour : {new Date(currentService.lastEventAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </Text>
      )}
      <View style={panelStyles.panelDivider} />
    </>
  );
}

const styles = StyleSheet.create({
  serviceClient: { color: COLORS.bleuNuit, fontSize: 13, fontWeight: "600", marginBottom: 4 },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  choiceButton: { borderWidth: 1, borderColor: "#C9BFA8", borderRadius: 5, paddingHorizontal: 7, paddingVertical: 6, backgroundColor: "#FFFDF8" },
  choiceButtonActive: { backgroundColor: COLORS.bleuNuit, borderColor: COLORS.bleuNuit },
  choiceLabel: { color: COLORS.bleuNuit, fontSize: 10 },
  choiceLabelActive: { color: COLORS.or },
  serviceTimestamp: { color: "#8A8A8A", fontSize: 9, marginTop: 8 },
});
