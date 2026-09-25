import React, { useEffect, useState } from "react";
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
import { MenuScreen } from "../screens/MenuScreen";
import { MessagerieScreen } from "../screens/MessagerieScreen";
import { ConversationScreen } from "../screens/ConversationScreen";
import { InviterEquipierScreen } from "../screens/InviterEquipierScreen";
import { ScannerInvitationScreen } from "../screens/ScannerInvitationScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { GestionAccesScreen } from "../screens/GestionAccesScreen";
import { DevCreatorPanelScreen } from "../screens/DevCreatorPanelScreen";
import { ActivationCompteScreen } from "../screens/ActivationCompteScreen";
import { CompteRenduScreen, ComptesRendusRecusScreen } from "../screens/CompteRenduScreen";
import { ComptesEquipeScreen } from "../screens/ComptesEquipeScreen";
import { DelegationsScreen } from "../screens/DelegationsScreen";
import { JournalAuditScreen } from "../screens/JournalAuditScreen";
import { api } from "../api/client";
import PlanDeSalle from "../components/PlanDeSalle";
import { useSalleStore } from "../store/salleStore";
import { useChecklistStore } from "../store/checklistStore";
import { isServiceLocked, useSessionStore } from "../store/sessionStore";
import { can, type AccessRole, type Delegation, type DroitsSession, type IdentiteConnexion, type Permission, type Pole, type PlatformRole, type PoleService } from "@resto-plus/types";

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
  Menu: undefined;
  Messagerie: undefined;
  Conversation: { conversationId: string; titre: string };
  InviterEquipier: undefined;
  ScannerInvitation: undefined;
  GestionAcces: undefined;
  DevCreator: undefined;
  ActivationCompte: undefined;
  EspaceDirection: undefined;
  CompteRendu: { pole: PoleService };
  ComptesRendusRecus: undefined;
  ComptesEquipe: undefined;
  Delegations: undefined;
  JournalAudit: undefined;
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

const lockStyles = StyleSheet.create({
  bar: { backgroundColor: colors.navy, paddingVertical: 8, paddingHorizontal: spacing.md, alignItems: "center" },
  barUnlocked: { backgroundColor: colors.gold },
  label: { color: colors.gold, fontSize: 11, fontWeight: "600" },
  labelUnlocked: { color: colors.navy },
});

function RestrictedMessage({ text }: { text: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, backgroundColor: colors.cream }}>
      <Text style={{ color: colors.navy, fontFamily: typography.serif, fontSize: 18, textAlign: "center" }}>{text}</Text>
    </View>
  );
}

const ROLE_LEVEL_LABEL: Record<AccessRole, string> = {
  serveur: "N0",
  chef_rang: "N1",
  manager_admin: "N2",
  directeur_admin: "N3",
};

// Le niveau affiché est celui du compte connecté : il n'est jamais modifiable depuis
// l'écran (seule la gestion des accès, côté N2+, attribue un niveau).
function PlanSalle({ role, allows, onBack, onOpenClient, onOpenConfigurator }: { role: AccessRole; allows: (permission: Permission) => boolean; onBack: () => void; onOpenClient: (tableId: string) => void; onOpenConfigurator: () => void }) {
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
  // Droits de l'utilisateur courant : même matrice que l'API (packages/types/src/permissions.ts).
  const allows = (permission: Permission) => can({ accessRole: currentAccessRole, pole: currentPole }, permission);
  const currentUser = useSessionStore((state) => state.currentUser);
  const serviceUnlocked = useSessionStore((state) => state.serviceUnlocked);
  const serviceLocked = isServiceLocked(currentUser, serviceUnlocked);
  // Console N4 : il n'existe pas encore de compte N4 de démo, on la réserve au N3
  // en plus du flag d'environnement (qui, seul, l'ouvrait à tous les comptes).
  const canOpenCreatorPanel = platformRole === "dev_creator" && currentAccessRole === "directeur_admin";

  // Délégation reçue du N3 : relève temporairement le niveau (N1 → droits du N2).
  const [delegation, setDelegation] = useState<Delegation | undefined>();

  /** Droits effectifs vus par l'API. Hors ligne, on garde les derniers connus. */
  const rafraichirDroits = async () => {
    try {
      const droits = await api.get<DroitsSession>("/session/droits");
      setCurrentAccessRole(droits.accessRole);
      setDelegation(droits.delegation);
    } catch {
      // hors ligne
    }
  };

  const connecter = (identity: IdentiteConnexion) => {
    setCurrentAccessRole(identity.accessRole);
    setCurrentPole(identity.pole);
    setDelegation(undefined);
    useSessionStore.getState().setCurrentUser({ id: identity.id, nom: identity.nom, accessRole: identity.accessRole, pole: identity.pole });
    setAuthenticated(true);
    void rafraichirDroits();
  };

  const bandeauDelegation = delegation
    ? `Délégation active : tu assures les tâches du ${delegation.pole === "cuisine" ? "chef de cuisine" : "manager de salle"} jusqu’au ${new Date(delegation.fin).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}.`
    : undefined;

  if (!authenticated) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login">
            {({ navigation }) => (
              <LoginScreen
                onLogin={connecter}
                onTemporaryAccess={() => navigation.navigate("ScannerInvitation")}
                onActivateAccount={() => navigation.navigate("ActivationCompte")}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="ActivationCompte">
            {({ navigation }) => (
              <View style={{ flex: 1 }}>
                <CustomHeader title="Première connexion" onBack={() => navigation.goBack()} />
                <ActivationCompteScreen onActivated={connecter} />
              </View>
            )}
          </Stack.Screen>
          <Stack.Screen name="ScannerInvitation">
            {({ navigation }) => (
              <View style={{ flex: 1 }}>
                <CustomHeader title="Rejoindre un restaurant" onBack={() => navigation.goBack()} />
                <ScannerInvitationScreen
                  onBack={() => navigation.goBack()}
                  onAccessGranted={(pole, displayName) => {
                    setCurrentAccessRole("serveur");
                    setCurrentPole(pole);
                    useSessionStore.getState().setCurrentUser({ id: `invite-${Date.now()}`, nom: displayName || "Intérimaire", accessRole: "serveur", pole });
                    setAuthenticated(true);
                  }}
                />
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
        <Stack.Screen name="Accueil" listeners={{ focus: () => void rafraichirDroits() }}>
          {({ navigation }) => (
            <AccueilScreen
              prenomUtilisateur="Chef"
              nomEtablissement="Le Grand Palais"
              pole={currentPole}
              espaceActif="operationnel"
              onChangerEspace={() => {}}
              onOpenCreatorPanel={canOpenCreatorPanel ? () => navigation.navigate("DevCreator") : undefined}
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
                } else if (dest === "espace_direction") {
                  navigation.navigate("EspaceDirection");
                } else if (dest === "messagerie") {
                  navigation.navigate("Messagerie");
                } else if (dest === "scanner_invitation") {
                  navigation.navigate("ScannerInvitation");
                }
              }}
              bandeau={bandeauDelegation}
              checklistsEnAttente={getNombreEnAttente()}
              arriveesVip={0}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="PlanSalle">
          {({ navigation }) => (
            <PlanSalle
              role={currentAccessRole}
              allows={allows}
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
                canEditClient={!serviceLocked && allows("client.editer")}
                canOrder={!serviceLocked && allows("service.commander")}
                serviceLocked={serviceLocked}
              />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="ConfigurateurSalle">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader title="Configurateur de salle" onBack={() => navigation.goBack()} />
              {allows("salle.configurer") ? (
                <ConfigurateurSalleScreen onBack={() => navigation.goBack()} />
              ) : (
                <RestrictedMessage text="Configuration de la salle réservée aux niveaux N2 et N3." />
              )}
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
                  canValidateReport={allows("compte_rendu.cuisine")}
                  onNavigate={(destination) => {
                    if (destination === "checklists") navigation.navigate("Checklist");
                    if (destination === "commandes_cuisine") navigation.navigate("CommandesCuisine");
                    if (destination === "gestion_stocks") navigation.navigate("Stock");
                    if (destination === "gestion_carte") navigation.navigate("Menu");
                    if (destination === "compte_rendu") navigation.navigate("CompteRendu", { pole: "cuisine" });
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
                  canManageAccess={allows("acces.gerer")}
                  canManageLayout={allows("salle.configurer")}
                  canManageInvitations={allows("invitation.creer")}
                  canValidateReport={allows("compte_rendu.salle")}
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
                    if (destination === "compte_rendu") navigation.navigate("CompteRendu", { pole: "salle" });
                  }}
                />
              ) : (
                <RestrictedMessage text="Cet espace est réservé au pôle salle." />
              )}
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="EspaceDirection">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader title="Espace direction" onBack={() => navigation.goBack()} />
              {currentPole === "direction" ? (
                <EspaceEquipeScreen
                  espace="direction"
                  canManageAccess={allows("acces.gerer")}
                  onNavigate={(destination) => {
                    if (destination === "comptes_rendus_recus") navigation.navigate("ComptesRendusRecus");
                    if (destination === "comptes_equipe") navigation.navigate("ComptesEquipe");
                    if (destination === "delegations") navigation.navigate("Delegations");
                    if (destination === "journal_audit") navigation.navigate("JournalAudit");
                    if (destination === "gestion_acces") navigation.navigate("GestionAcces");
                  }}
                />
              ) : (
                <RestrictedMessage text="Cet espace est réservé à la direction." />
              )}
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="CompteRendu">
          {({ navigation, route }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader title="Compte rendu du service" onBack={() => navigation.goBack()} />
              {allows(route.params.pole === "cuisine" ? "compte_rendu.cuisine" : "compte_rendu.salle") ? (
                <CompteRenduScreen pole={route.params.pole} />
              ) : (
                <RestrictedMessage text="Compte rendu réservé au responsable du pôle (N2)." />
              )}
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="ComptesRendusRecus">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader title="Comptes rendus reçus" onBack={() => navigation.goBack()} />
              {allows("compte_rendu.consulter") ? <ComptesRendusRecusScreen /> : <RestrictedMessage text="Accès réservé à la direction." />}
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="ComptesEquipe">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader title="Comptes de l’équipe" onBack={() => navigation.goBack()} />
              {allows("comptes.gerer") ? <ComptesEquipeScreen /> : <RestrictedMessage text="Création de comptes réservée au directeur (N3)." />}
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="Delegations">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader title="Délégation des tâches" onBack={() => navigation.goBack()} />
              {allows("delegations.gerer") ? <DelegationsScreen /> : <RestrictedMessage text="Délégations réservées au directeur (N3)." />}
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="JournalAudit">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader title="Journal d’audit" onBack={() => navigation.goBack()} />
              {allows("audit.consulter") ? <JournalAuditScreen /> : <RestrictedMessage text="Journal réservé au directeur (N3)." />}
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
                canCreate={allows("stock.entree")}
                onOpenItem={(itemId) => navigation.navigate("StockItem", { itemId })}
              />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="StockItem">
          {({ navigation, route }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader title="Article en stock" onBack={() => navigation.goBack()} />
              <StockItemDetailScreen
                itemId={route.params.itemId}
                canEntree={allows("stock.entree")}
                canSortie={allows("stock.sortie")}
                onDeleted={() => navigation.goBack()}
              />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="Menu">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader title="Gestion de la carte" onBack={() => navigation.goBack()} />
              <MenuScreen canManage={allows("carte.gerer")} />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="Messagerie">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader title="Messagerie" onBack={() => navigation.goBack()} />
              <MessagerieScreen onOpenConversation={(conversationId, titre) => navigation.navigate("Conversation", { conversationId, titre })} />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="Conversation">
          {({ navigation, route }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader title={route.params.titre} onBack={() => navigation.goBack()} />
              <ConversationScreen conversationId={route.params.conversationId} />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="InviterEquipier">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader title="Inviter un équipier" onBack={() => navigation.goBack()} />
              {allows("invitation.creer") ? (
                <InviterEquipierScreen
                  onBack={() => navigation.goBack()}
                  onOpenScanner={() => navigation.navigate("ScannerInvitation")}
                />
              ) : (
                <RestrictedMessage text="Invitations réservées au directeur d’établissement (N3)." />
              )}
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
              {allows("acces.gerer") ? (
                <GestionAccesScreen
                  onBack={() => navigation.goBack()}
                  onInvite={allows("invitation.creer") ? () => navigation.navigate("InviterEquipier") : undefined}
                  canChangePole={allows("acces.changer_pole")}
                />
              ) : (
                <RestrictedMessage text="Gestion des accès réservée aux niveaux N2 et N3." />
              )}
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="DevCreator">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader title="Console créateur" onBack={() => navigation.goBack()} />
              {canOpenCreatorPanel ? (
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
              <ReservationsScreen canEdit={allows("reservation.gerer")} />
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
              <TachesSalleScreen canReset={allows("taches.reinitialiser")} />
            </View>
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}