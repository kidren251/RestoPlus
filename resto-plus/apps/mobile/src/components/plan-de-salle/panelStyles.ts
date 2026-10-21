import { StyleSheet } from "react-native";
import { COLORS } from "./couleurs";

/** Styles communs aux sections du panneau latéral d'une table. */
export const panelStyles = StyleSheet.create({
  panelLabel: {
    fontSize: 11,
    color: COLORS.bleuNuit,
    opacity: 0.7,
    marginTop: 12,
    marginBottom: 4,
  },
  panelDivider: {
    height: 1,
    backgroundColor: "#C9BFA8",
    marginVertical: 16,
  },
  panelSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.bleuNuit,
    marginBottom: 8,
  },
});
