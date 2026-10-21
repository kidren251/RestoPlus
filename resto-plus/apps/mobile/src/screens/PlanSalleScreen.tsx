import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, spacing } from "@resto-plus/ui-luxury";
import type { AccessRole } from "@resto-plus/types";
import PlanDeSalle from "../components/plan-de-salle/PlanDeSalle";
import { CustomHeader, headerStyles } from "../navigation/CustomHeader";
import { usePermissions } from "../hooks/usePermissions";
import { useSalleStore } from "../store/salleStore";
import { useSessionStore } from "../store/sessionStore";

const ROLE_LEVEL_LABEL: Record<AccessRole, string> = {
  serveur: "N0",
  chef_rang: "N1",
  manager_admin: "N2",
  directeur_admin: "N3",
};

// Le niveau affiché est celui du compte connecté : il n'est jamais modifiable depuis
// l'écran (seule la gestion des accès, côté N2+, attribue un niveau).
export function PlanSalleScreen({ onBack, onOpenClient, onOpenConfigurator }: { onBack: () => void; onOpenClient: (tableId: string) => void; onOpenConfigurator: () => void }) {
  const allows = usePermissions();
  const role = useSessionStore((state) => state.effectiveAccessRole) ?? "serveur";
  const isDirector = role === "directeur_admin";
  // Directeur : plan et service verrouillés par défaut, pour qu'un clic depuis le
  // bureau ne déplace pas une table ni ne touche au service en cours.
  const [layoutLocked, setLayoutLocked] = useState(isDirector);
  const serviceUnlocked = useSessionStore((state) => state.serviceUnlocked);
  const setServiceUnlocked = useSessionStore((state) => state.setServiceUnlocked);
  useEffect(() => {
    setServiceUnlocked(false);
  }, [setServiceUnlocked]);
  const isAdmin = allows("salle.configurer");
  const serviceOpen = !isDirector || serviceUnlocked;

  return (
    <View style={{ flex: 1 }}>
      <CustomHeader
        title={isAdmin ? "Plan de salle — Édition" : `Plan de salle — ${role === "chef_rang" ? "Chef de rang" : "Serveur"}`}
        onBack={onBack}
        rightAction={<Text style={headerStyles.adminToggle}>{ROLE_LEVEL_LABEL[role]}</Text>}
      />
      {isDirector && (
        <Pressable
          style={[lockStyles.bar, serviceUnlocked && lockStyles.barUnlocked]}
          onPress={() => setServiceUnlocked(!serviceUnlocked)}
          accessibilityRole="button"
        >
          <Text style={[lockStyles.label, serviceUnlocked && lockStyles.labelUnlocked]}>
            {serviceUnlocked ? "🔓 Service déverrouillé · toucher pour reverrouiller" : "🔒 Service verrouillé · consultation seule · toucher pour déverrouiller"}
          </Text>
        </Pressable>
      )}
      <PlanDeSalle
        isAdmin={isAdmin}
        layoutLocked={layoutLocked}
        canEditService={serviceOpen && allows("service.suivre")}
        canRequestDish={serviceOpen && allows("service.commander")}
        onToggleLayoutLock={() => setLayoutLocked((locked) => !locked)}
        onOpenConfigurator={onOpenConfigurator}
        onTablePress={(tableId) => {
          if (role === "chef_rang") {
            const table = useSalleStore.getState().getTable(tableId);
            if (table?.statut === "libre") useSalleStore.getState().openTable(tableId);
          }
        }}
        onClientPress={onOpenClient}
      />
    </View>
  );
}

const lockStyles = StyleSheet.create({
  bar: { backgroundColor: colors.navy, paddingVertical: 8, paddingHorizontal: spacing.md, alignItems: "center" },
  barUnlocked: { backgroundColor: colors.gold },
  label: { color: colors.gold, fontSize: 11, fontWeight: "600" },
  labelUnlocked: { color: colors.navy },
});
