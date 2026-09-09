import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors, typography, spacing } from "@resto-plus/ui-luxury";
import { AccueilScreen } from "../screens/AccueilScreen";
import { ChecklistScreen } from "../screens/ChecklistScreen";
import { ReservationsScreen } from "../screens/ReservationsScreen";
import { TachesSalleScreen } from "../screens/TachesSalleScreen";
import { ClientEditionScreen } from "../screens/ClientEditionScreen";
import { ConfigurateurSalleScreen } from "../screens/ConfigurateurSalleScreen";
import { EspaceEquipeScreen } from "../screens/EspaceEquipeScreen";
import { CommandesCuisineScreen } from "../screens/CommandesCuisineScreen";
import { InviterEquipierScreen } from "../screens/InviterEquipierScreen";
import { ScannerInvitationScreen } from "../screens/ScannerInvitationScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { GestionAccesScreen } from "../screens/GestionAccesScreen";
import PlanDeSalle from "../components/PlanDeSalle";
import { useSalleStore } from "../store/salleStore";
import { useChecklistStore } from "../store/checklistStore";
import type { AccessRole } from "@resto-plus/types";

export type RootStackParamList = {
  Login: undefined;
  Accueil: undefined;
  PlanSalle: undefined;
  Checklist: undefined;
  Reservations: undefined;
  TachesSalle: undefined;
  ClientEdition: { tableId: string };
  ConfigurateurSalle: undefined;
  EspaceCuisine: undefined;
  EspaceSalle: undefined;
  CommandesCuisine: undefined;
  InviterEquipier: undefined;
  ScannerInvitation: undefined;
  GestionAcces: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function CustomHeader({
  title,
  onBack,
  rightAction,
}: {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}) {
  return (
    <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.cream }}>
      <View style={headerStyles.container}>
        {onBack ? (
          <Pressable onPress={onBack} style={headerStyles.backBtn} hitSlop={12}>
            <Text style={headerStyles.backIcon}>←</Text>
          </Pressable>
        ) : (
          <View style={headerStyles.backBtn} />
        )}
        <Text style={headerStyles.title}>{title}</Text>
        <View style={headerStyles.rightBtn}>{rightAction}</View>
      </View>
    </SafeAreaView>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.cream,
    borderBottomWidth: 1,
    borderBottomColor: colors.creamBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  rightBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionButton: {
    minWidth: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 18,
    color: colors.gold,
  },
  title: {
    fontFamily: typography.serif,
    fontSize: 14,
    color: colors.navy,
    letterSpacing: 0.3,
  },
  adminToggle: {
    fontSize: 20,
  },
  lockLabel: {
    color: colors.statusOccupied,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  configLabel: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});

function PlanSalleWithToggle({ onBack, onOpenClient, onOpenConfigurator }: { onBack: () => void; onOpenClient: (tableId: string) => void; onOpenConfigurator: () => void }) {
  const [role, setRole] = useState<AccessRole>("manager_admin");
  const [layoutLocked, setLayoutLocked] = useState(false);
  const isAdmin = role === "manager_admin";
  const roleLabel = role === "manager_admin" ? "ADM" : role === "access_admin" ? "A-ADM" : role === "chef_rang" ? "R1" : "R0";
  const nextRole: Record<AccessRole, AccessRole> = {
    manager_admin: "access_admin",
    access_admin: "chef_rang",
    chef_rang: "serveur",
    serveur: "manager_admin",
  };

  return (
    <View style={{ flex: 1 }}>
      <CustomHeader
        title={isAdmin ? "Plan de salle — Édition" : `Plan de salle — ${role === "access_admin" ? "Admin des accès" : role === "chef_rang" ? "Chef de rang" : "Serveur"}`}
        onBack={onBack}
        rightAction={
          <View style={headerStyles.actions}>
            {isAdmin && (
              <>
                <Pressable onPress={() => setLayoutLocked((locked) => !locked)} hitSlop={10} style={headerStyles.actionButton}>
                  <Text style={headerStyles.lockLabel}>{layoutLocked ? "LOCK" : "EDIT"}</Text>
                </Pressable>
                <Pressable onPress={onOpenConfigurator} hitSlop={10} style={headerStyles.actionButton}>
                  <Text style={headerStyles.configLabel}>CFG</Text>
                </Pressable>
              </>
            )}
            <Pressable
              onPress={() => setRole((current) => nextRole[current])}
              hitSlop={16}
              style={headerStyles.actionButton}
            >
              <Text style={headerStyles.adminToggle}>{roleLabel}</Text>
            </Pressable>
          </View>
        }
      />
      <PlanDeSalle
        isAdmin={isAdmin}
        layoutLocked={layoutLocked}
        role={role}
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

export function AppNavigator() {
  const [authenticated, setAuthenticated] = useState(false);
  const [currentAccessRole, setCurrentAccessRole] = useState<AccessRole>("manager_admin");
  const { loadSalle } = useSalleStore();
  const { getNombreEnAttente } = useChecklistStore();

  if (!authenticated) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login">
            {({ navigation }) => (
              <LoginScreen
                onLogin={() => { setCurrentAccessRole("manager_admin"); setAuthenticated(true); }}
                onTemporaryAccess={() => navigation.navigate("ScannerInvitation")}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="ScannerInvitation">
            {({ navigation }) => (
              <View style={{ flex: 1 }}>
                <CustomHeader title="Rejoindre un restaurant" onBack={() => navigation.goBack()} />
                <ScannerInvitationScreen onBack={() => navigation.goBack()} onAccessGranted={() => { setCurrentAccessRole("serveur"); setAuthenticated(true); }} />
              </View>
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: "slide_from_right" }}
      >
        <Stack.Screen name="Accueil">
          {({ navigation }) => (
            <AccueilScreen
              prenomUtilisateur="Chef"
              nomEtablissement="Le Grand Palais"
              espaceActif="operationnel"
              onChangerEspace={() => {}}
              onNaviguer={(dest) => {
                if (dest === "plan_salle") {
                  loadSalle();
                  navigation.navigate("PlanSalle");
                } else if (dest === "checklists") {
                  navigation.navigate("Checklist");
                } else if (dest === "fiches_vip") {
                  navigation.navigate("Reservations");
                } else if (dest === "taches_salle") {
                  navigation.navigate("TachesSalle");
                } else if (dest === "espace_cuisine") {
                  navigation.navigate("EspaceCuisine");
                } else if (dest === "espace_salle") {
                  navigation.navigate("EspaceSalle");
                } else if (dest === "scanner_invitation") {
                  navigation.navigate("ScannerInvitation");
                }
              }}
              checklistsEnAttente={getNombreEnAttente()}
              arriveesVip={0}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="PlanSalle">
          {({ navigation }) => (
            <PlanSalleWithToggle
              onBack={() => navigation.goBack()}
              onOpenClient={(tableId) => {
                navigation.navigate("ClientEdition", { tableId });
              }}
              onOpenConfigurator={() => navigation.navigate("ConfigurateurSalle")}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="ClientEdition">
          {({ navigation, route }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader title="Édition client" onBack={() => navigation.goBack()} />
              <ClientEditionScreen
                tableId={route.params.tableId}
                onBack={() => navigation.goBack()}
              />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="ConfigurateurSalle">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader title="Configurateur de salle" onBack={() => navigation.goBack()} />
              <ConfigurateurSalleScreen onBack={() => navigation.goBack()} />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="EspaceCuisine">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader title="Espace cuisine" onBack={() => navigation.goBack()} />
              <EspaceEquipeScreen
                espace="cuisine"
                onNavigate={(destination) => {
                  if (destination === "checklists") navigation.navigate("Checklist");
                  if (destination === "commandes_cuisine") navigation.navigate("CommandesCuisine");
                }}
              />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="EspaceSalle">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader title="Espace équipe de salle" onBack={() => navigation.goBack()} />
              <EspaceEquipeScreen
                espace="salle"
                canManageAccess={currentAccessRole === "manager_admin" || currentAccessRole === "access_admin"}
                onNavigate={(destination) => {
                  if (destination === "plan_salle") {
                    loadSalle();
                    navigation.navigate("PlanSalle");
                  }
                  if (destination === "fiches_vip") navigation.navigate("Reservations");
                  if (destination === "taches_salle") navigation.navigate("TachesSalle");
                  if (destination === "inviter_equipier") navigation.navigate("InviterEquipier");
                  if (destination === "gestion_acces") navigation.navigate("GestionAcces");
                }}
              />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="CommandesCuisine">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader title="Suivi des plats" onBack={() => navigation.goBack()} />
              <CommandesCuisineScreen />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="InviterEquipier">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader title="Inviter un équipier" onBack={() => navigation.goBack()} />
              <InviterEquipierScreen
                onBack={() => navigation.goBack()}
                onOpenScanner={() => navigation.navigate("ScannerInvitation")}
              />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="ScannerInvitation">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader title="Scanner une invitation" onBack={() => navigation.goBack()} />
              <ScannerInvitationScreen onBack={() => navigation.goBack()} onAccessGranted={() => {}} />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="GestionAcces">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader title="Gestion des accès" onBack={() => navigation.goBack()} />
              <GestionAccesScreen
                onBack={() => navigation.goBack()}
                onInvite={() => navigation.navigate("InviterEquipier")}
              />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="Checklist">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader
                title="Checklists HACCP"
                onBack={() => navigation.goBack()}
              />
              <ChecklistScreen />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="Reservations">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader
                title="Réservations du soir"
                onBack={() => navigation.goBack()}
              />
              <ReservationsScreen />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="TachesSalle">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader
                title="Tâches de salle"
                onBack={() => navigation.goBack()}
              />
              <TachesSalleScreen />
            </View>
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}