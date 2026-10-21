import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useSalleStore } from "../../store/salleStore";
import { COLORS, couleurStatutPlat } from "./couleurs";
import { formatHeure, labelStatutPlat } from "./libelles";
import { panelStyles } from "./panelStyles";

/** Section « Commande en cours » du panneau : plats de la table, horaires, réclamer un plat. */
export function CommandeEnCours({ tableId, canRequestDish }: { tableId: string; canRequestDish: boolean }) {
  const getCommande = useSalleStore((s) => s.getCommande);
  const requestDish = useSalleStore((s) => s.requestDish);
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedDishId(null);
  }, [tableId]);

  const commande = getCommande(tableId);

  return (
    <>
      <Text style={panelStyles.panelSectionTitle}>Commande en cours</Text>
      {!commande || commande.lignes.length === 0 ? (
        <Text style={styles.panelEmptyText}>Aucune commande en cours pour cette table.</Text>
      ) : (
        commande.lignes.map((ligne) => (
          <Pressable
            key={ligne.id}
            style={styles.ligneCommande}
            onPress={() => setSelectedDishId(selectedDishId === ligne.id ? null : ligne.id)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.ligneNom}>
                {ligne.quantite}× {ligne.nom}
              </Text>
              {selectedDishId === ligne.id && (
                <View style={styles.ligneHoraires}>
                  <Text style={styles.ligneHoraire}>
                    Réclamé : {formatHeure(ligne.reclameAt)}
                  </Text>
                  <Text style={styles.ligneHoraire}>
                    Servi : {formatHeure(ligne.serviAt)}
                  </Text>
                  {canRequestDish && (ligne.statut === "en_preparation" || ligne.statut === "en_attente") && (
                    <Pressable style={styles.requestButton} onPress={() => requestDish(tableId, ligne.id)}>
                      <Text style={styles.requestButtonLabel}>Réclamer ce plat</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
            <View style={[styles.badgeStatut, { backgroundColor: couleurStatutPlat(ligne.statut) }]}>
              <Text style={styles.badgeStatutLabel}>{labelStatutPlat(ligne.statut)}</Text>
            </View>
          </Pressable>
        ))
      )}
      <Text style={styles.panelNote}>
        Données de démonstration — sera branché sur le système de commande et la cuisine dans une
        prochaine phase.
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  panelEmptyText: {
    fontSize: 12,
    color: COLORS.bleuNuit,
    opacity: 0.6,
    fontStyle: "italic",
  },
  ligneCommande: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ligneNom: {
    fontSize: 13,
    color: COLORS.bleuNuit,
  },
  ligneHoraires: {
    marginTop: 4,
    gap: 2,
  },
  ligneHoraire: {
    color: "#8A8A8A",
    fontSize: 9,
  },
  requestButton: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.or,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 5,
    marginTop: 5,
  },
  requestButtonLabel: { color: COLORS.bleuNuit, fontSize: 9, fontWeight: "700" },
  badgeStatut: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeStatutLabel: {
    fontSize: 10,
    color: COLORS.blancCreme,
    fontWeight: "600",
  },
  panelNote: {
    fontSize: 10,
    color: COLORS.bleuNuit,
    opacity: 0.5,
    marginTop: 16,
    fontStyle: "italic",
  },
});
