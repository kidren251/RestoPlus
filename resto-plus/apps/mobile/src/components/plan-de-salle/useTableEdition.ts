import { useEffect, useState } from "react";
import type { Table } from "@resto-plus/types";
import { useSalleStore } from "../../store/salleStore";

/** Brouillons nom / capacité de la table ouverte dans le panneau, et leur enregistrement. */
export function useTableEdition(table: Table | undefined) {
  const updateTableInfo = useSalleStore((s) => s.updateTableInfo);
  const [nomDraft, setNomDraft] = useState("");
  const [capaciteDraft, setCapaciteDraft] = useState("");

  useEffect(() => {
    if (table) {
      setNomDraft(table.nom ?? table.id);
      setCapaciteDraft(String(table.capacite));
    }
  }, [table?.id]);

  const enregistrerNom = () => {
    if (!table) return;
    const trimmed = nomDraft.trim();
    if (trimmed && trimmed !== (table.nom ?? table.id)) {
      updateTableInfo(table.id, { nom: trimmed });
    }
  };

  const enregistrerCapacite = () => {
    if (!table) return;
    const n = parseInt(capaciteDraft, 10);
    if (!isNaN(n) && n > 0 && n !== table.capacite) {
      updateTableInfo(table.id, { capacite: n });
    } else {
      setCapaciteDraft(String(table.capacite));
    }
  };

  const ajusterCapacite = (delta: number) => {
    if (!table) return;
    const n = Math.max(1, table.capacite + delta);
    setCapaciteDraft(String(n));
    updateTableInfo(table.id, { capacite: n });
  };

  return { nomDraft, setNomDraft, capaciteDraft, setCapaciteDraft, enregistrerNom, enregistrerCapacite, ajusterCapacite };
}
