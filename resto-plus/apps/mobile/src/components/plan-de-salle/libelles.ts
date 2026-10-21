import type { TableServiceState } from "@resto-plus/types";
import type { StatutPlat } from "../../store/salleStore";

export function labelStatutPlat(statut: StatutPlat): string {
  switch (statut) {
    case "en_attente":
      return "En attente";
    case "en_preparation":
      return "En préparation";
    case "pret":
      return "Prêt — à servir";
    case "servi":
      return "Servi";
    default:
      return statut;
  }
}

export function labelCourse(course: TableServiceState["course"]): string {
  return { aucun: "", entree: "Entrée", plat: "Plat", dessert: "Dessert" }[course];
}

export function labelDishStatus(status: TableServiceState["dishStatus"]): string {
  return { aucun: "", a_reclamer: "À réclamer", servi: "Servi" }[status];
}

export function formatHeure(timestamp?: string): string {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
