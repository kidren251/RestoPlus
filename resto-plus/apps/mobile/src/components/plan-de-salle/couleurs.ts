import { Dimensions } from "react-native";
import type { StatutTable } from "@resto-plus/types";
import type { StatutPlat } from "../../store/salleStore";

// ---- Charte "Digital Luxury" ----
export const COLORS = {
  bleuNuit: "#0B1E33",
  or: "#C9A227",
  blancCreme: "#F6F1E7",
  libre: "#3A7D5C",
  occupee: "#B0413E",
  reservee: "#C9A227",
  a_nettoyer: "#8A8A8A",
  decor: "#D9D2C2",
};

export const PANEL_WIDTH = Math.min(300, Dimensions.get("window").width * 0.8);

export function couleurStatut(statut: StatutTable): string {
  return COLORS[statut] ?? COLORS.a_nettoyer;
}

export function couleurStatutPlat(statut: StatutPlat): string {
  switch (statut) {
    case "en_attente":
      return "#8A8A8A";
    case "en_preparation":
      return "#C9A227";
    case "pret":
      return "#3A7D5C";
    case "servi":
      return "#4A6FA5";
    default:
      return "#8A8A8A";
  }
}
