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
import { StockScreen } from "../screens/StockScreen";
import { StockItemDetailScreen } from "../screens/StockItemDetailScreen";
import { InviterEquipierScreen } from "../screens/InviterEquipierScreen";
import { ScannerInvitationScreen } from "../screens/ScannerInvitationScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { GestionAccesScreen } from "../screens/GestionAccesScreen";
import { DevCreatorPanelScreen } from "../screens/DevCreatorPanelScreen";
import PlanDeSalle from "../components/PlanDeSalle";
import { useSalleStore } from "../store/salleStore";
import { useChecklistStore } from "../store/checklistStore";
import type { AccessRole, Pole, PlatformRole } from "@resto-plus/types";

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
  Stock: undefined;
  StockItem: { itemId: string };
  InviterEquipier: undefined;
  ScannerInvitation: undefined;
  GestionAcces: undefined;
  DevCreator: undefined;
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

function RestrictedMessage({ text }: { text: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, backgroundColor: colors.cream }}>
      <Text style={{ color: colors.navy, fontFamily: typography.serif, fontSize: 18, textAlign: "center" }}>{text}</Text>
    </View>
  );
}

function PlanSalleWithToggle({ onBack, onOpenClient, onOpenConfigurator }: { onBack: () => void; onOpenClient: (tableId: string) => void; onOpenConfigurator: () => void }) {
  const [role, setRole] = useState<AccessRole>("manager_admin");
  const [layoutLocked, setLayoutLocked] = useState(false);
  const isAdmin = role === "manager_admin" || role === "directeur_admin";
  const roleLabel = role === "directeur_admin" ? "N3" : role === "manager_admin" ? "N2" : role === "chef_rang" ? "N1" : "N0";
  const nextRole: Record<AccessRole, AccessRole> = {
    serveur: "chef_rang",
    chef_rang: "manager_admin",
    manager_admin: "directeur_admin",
    directeur_admin: "serveur",
  };

  return (
    <View style={{ flex: 1 }}>
      <CustomHeader
        title={isAdmin ? "Plan de salle — Édition" : `Plan de salle — ${role === "chef_rang" ? "Chef de rang" : "Serveur"}`}
        onBack={onBack}
        rightAction={
          <Pressable
            onPress={() => setRole((current) => nextRole[current])}
            hitSlop={16}
            style={headerStyles.actionButton}
          >
            <Text style={headerStyles.adminToggle}>{roleLabel}</Text>
          </Pressable>
        }
      />
      <PlanDeSalle
        isAdmin={isAdmin}
        layoutLocked={layoutLocked}
        role={role}
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

export function AppNavigator() {
  const [authenticated, setAuthenticated] = useState(false);
  // Rôle et pôle métier de l'utilisateur courant : déterminent les espaces équipe
  // visibles (cuisine vs salle) et les droits d'administration. Résolus depuis le
  // compte de démo choisi à l'écran de connexion (voir docs/comptes-demo.md) ; pour
  // un accès temporaire (QR d'invitation), le pôle vient de l'invitation elle-même.
  const [currentAccessRole, setCurrentAccessRole] = useState<AccessRole>("directeur_admin");
  const [currentPole, setCurrentPole] = useState<Pole>("direction");
  const [platformRole] = useState<PlatformRole>(
    process.env.EXPO_PUBLIC_PLATFORM_ROLE === "dev_creator" ? "dev_creator" : "restaurant_user"
  );
  const { loadSalle } = useSalleStore();
  const { getNombreEnAttente } = useChecklistStore();

  if (!authenticated) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login">
            {({ navigation }) => (
              <LoginScreen
                onLogin={(account) => { setCurrentAccessRole(account.accessRole); setCurrentPole(account.pole); setAuthenticated(true); }}
                onTemporaryAccess={() => navigation.navigate("ScannerInvitation")}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="ScannerInvitation">
            {({ navigation }) => (
              <View style={{ flex: 1 }}>
                <CustomHeader title="Rejoindre un restaurant" onBack={() => navigation.goBack()} />
                <ScannerInvitationScreen onBack={() => navigation.goBack()} onAccessGranted={(pole) => { setCurrentAccessRole("serveur"); setCurrentPole(pole); setAuthenticated(true); }} />
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
              pole={currentPole}
              espaceActif="operationnel"
              onChangerEspace={() => {}}
              onOpenCreatorPanel={platformRole === "dev_creator" ? () => navigation.navigate("DevCreator") : undefined}
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
              {currentPole === "cuisine" || currentPole === "direction" ? (
                <EspaceEquipeScreen
                  espace="cuisine"
                  onNavigate={(destination) => {
                    if (destination === "checklists") navigation.navigate("Checklist");
                    if (destination === "commandes_cuisine") navigation.navigate("CommandesCuisine");
                    if (destination === "gestion_stocks") navigation.navigate("Stock");
                  }}
                />
              ) : (
                <RestrictedMessage text="Cet espace est réservé au pôle cuisine." />
              )}
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="EspaceSalle">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader title="Espace équipe de salle" onBack={() => navigation.goBack()} />
              {currentPole === "salle" || currentPole === "direction" ? (
                <EspaceEquipeScreen
                  espace="salle"
                  canManageAccess={currentAccessRole === "manager_admin" || currentAccessRole === "directeur_admin"}
                  canManageLayout={currentAccessRole === "manager_admin" || currentAccessRole === "directeur_admin"}
                  canManageInvitations={currentAccessRole === "directeur_admin"}
                  onNavigate={(destination) => {
                    if (destination === "plan_salle") {
                      loadSalle();
                      navigation.navigate("PlanSalle");
                    }
                    if (destination === "fiches_vip") navigation.navigate("Reservations");
                    if (destination === "taches_salle") navigation.navigate("TachesSalle");
                    if (destination === "inviter_equipier") navigation.navigate("InviterEquipier");
                    if (destination === "gestion_acces") navigation.navigate("GestionAcces");
                    if (destination === "configurateur_salle") navigation.navigate("ConfigurateurSalle");
                  }}
                />
              ) : (
                <RestrictedMessage text="Cet espace est réservé au pôle salle." />
              )}
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

        <Stack.Screen name="Stock">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader title="Gestion des stocks" onBack={() => navigation.goBack()} />
              <StockScreen
                canAdjust={currentAccessRole !== "serveur"}
                onOpenItem={(itemId) => navigation.navigate("StockItem", { itemId })}
              />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="StockItem">
          {({ navigation, route }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader title="Article en stock" onBack={() => navigation.goBack()} />
              <StockItemDetailScreen itemId={route.params.itemId} canAdjust={currentAccessRole !== "serveur"} />
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
              <ScannerInvitationScreen onBack={() => navigation.goBack()} onAccessGranted={() => navigation.goBack()} />
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

        <Stack.Screen name="DevCreator">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader title="Console créateur" onBack={() => navigation.goBack()} />
              {platformRole === "dev_creator" ? (
                <DevCreatorPanelScreen onBack={() => navigation.goBack()} />
              ) : (
                <RestrictedMessage text="Accès réservé au niveau N4." />
              )}
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