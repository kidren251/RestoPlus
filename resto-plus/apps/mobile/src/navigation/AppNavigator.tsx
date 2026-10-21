import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackNavigationProp } from "@react-navigation/native-stack";
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
import { PlanSalleScreen } from "../screens/PlanSalleScreen";
import { RequirePermission } from "../components/RequirePermission";
import { ScreenWithHeader } from "./CustomHeader";
import type { RootStackParamList } from "./types";
import { api } from "../api/client";
import { useSalleStore } from "../store/salleStore";
import { useChecklistStore } from "../store/checklistStore";
import { useSessionStore } from "../store/sessionStore";
import type { DroitsSession, IdentiteConnexion } from "@resto-plus/types";

export type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();
type Navigation = NativeStackNavigationProp<RootStackParamList>;

// Console N4 : il n'existe pas encore de compte N4 de démo, on la réserve au N3
// en plus du flag d'environnement (qui, seul, l'ouvrait à tous les comptes).
const PLATFORM_DEV_CREATOR = process.env.EXPO_PUBLIC_PLATFORM_ROLE === "dev_creator";

/** Droits effectifs vus par l'API (délégation comprise). Hors ligne, on garde les derniers connus. */
async function rafraichirDroits() {
  try {
    const droits = await api.get<DroitsSession>("/session/droits");
    useSessionStore.getState().setDroits(droits.accessRole, droits.delegation);
  } catch {
    // hors ligne
  }
}

function connecter(identity: IdentiteConnexion) {
  useSessionStore.getState().setCurrentUser({ id: identity.id, nom: identity.nom, accessRole: identity.accessRole, pole: identity.pole });
  void rafraichirDroits();
}

function ouvrirPlanSalle(navigation: Navigation) {
  useSalleStore.getState().loadSalle();
  navigation.navigate("PlanSalle");
}

/** Destinations des tuiles (accueil et espaces équipe) → écrans. */
function naviguerVers(navigation: Navigation, destination: string) {
  switch (destination) {
    case "plan_salle": return ouvrirPlanSalle(navigation);
    case "checklists": return navigation.navigate("Checklist");
    case "fiches_vip": return navigation.navigate("Reservations");
    case "taches_salle": return navigation.navigate("TachesSalle");
    case "espace_cuisine": return navigation.navigate("EspaceCuisine");
    case "espace_salle": return navigation.navigate("EspaceSalle");
    case "espace_direction": return navigation.navigate("EspaceDirection");
    case "messagerie": return navigation.navigate("Messagerie");
    case "scanner_invitation": return navigation.navigate("ScannerInvitation");
    case "commandes_cuisine": return navigation.navigate("CommandesCuisine");
    case "gestion_stocks": return navigation.navigate("Stock");
    case "gestion_carte": return navigation.navigate("Menu");
    case "inviter_equipier": return navigation.navigate("InviterEquipier");
    case "gestion_acces": return navigation.navigate("GestionAcces");
    case "configurateur_salle": return navigation.navigate("ConfigurateurSalle");
    case "comptes_rendus_recus": return navigation.navigate("ComptesRendusRecus");
    case "comptes_equipe": return navigation.navigate("ComptesEquipe");
    case "delegations": return navigation.navigate("Delegations");
    case "journal_audit": return navigation.navigate("JournalAudit");
  }
}

function texteDelegation(delegation: NonNullable<DroitsSession["delegation"]>): string {
  const fin = new Date(delegation.fin).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  return `Délégation active : tu assures les tâches du ${delegation.pole === "cuisine" ? "chef de cuisine" : "manager de salle"} jusqu’au ${fin}.`;
}

export function AppNavigator() {
  // Rôle et pôle de l'utilisateur courant : résolus depuis le compte choisi à la
  // connexion (voir docs/comptes-demo.md) ; pour un accès temporaire (QR d'invitation),
  // le pôle vient de l'invitation elle-même. Les écrans lisent leurs droits via usePermissions().
  const currentUser = useSessionStore((state) => state.currentUser);
  const effectiveAccessRole = useSessionStore((state) => state.effectiveAccessRole);
  const delegation = useSessionStore((state) => state.delegation);
  const { getNombreEnAttente } = useChecklistStore();
  const currentPole = currentUser?.pole;
  const canOpenCreatorPanel = PLATFORM_DEV_CREATOR && effectiveAccessRole === "directeur_admin";

  if (!currentUser) {
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
              <ScreenWithHeader title="Première connexion" onBack={() => navigation.goBack()}>
                <ActivationCompteScreen onActivated={connecter} />
              </ScreenWithHeader>
            )}
          </Stack.Screen>
          <Stack.Screen name="ScannerInvitation">
            {({ navigation }) => (
              <ScreenWithHeader title="Rejoindre un restaurant" onBack={() => navigation.goBack()}>
                <ScannerInvitationScreen
                  onBack={() => navigation.goBack()}
                  onAccessGranted={(pole, displayName) => {
                    useSessionStore.getState().setCurrentUser({ id: `invite-${Date.now()}`, nom: displayName || "Intérimaire", accessRole: "serveur", pole });
                  }}
                />
              </ScreenWithHeader>
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        <Stack.Screen name="Accueil" listeners={{ focus: () => void rafraichirDroits() }}>
          {({ navigation }) => (
            <AccueilScreen
              prenomUtilisateur="Chef"
              nomEtablissement="Le Grand Palais"
              pole={currentUser.pole}
              espaceActif="operationnel"
              onChangerEspace={() => {}}
              onOpenCreatorPanel={canOpenCreatorPanel ? () => navigation.navigate("DevCreator") : undefined}
              onNaviguer={(dest) => naviguerVers(navigation, dest)}
              bandeau={delegation ? texteDelegation(delegation) : undefined}
              checklistsEnAttente={getNombreEnAttente()}
              arriveesVip={0}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="PlanSalle">
          {({ navigation }) => (
            <PlanSalleScreen
              onBack={() => navigation.goBack()}
              onOpenClient={(tableId) => navigation.navigate("ClientEdition", { tableId })}
              onOpenConfigurator={() => navigation.navigate("ConfigurateurSalle")}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="ClientEdition">
          {({ navigation, route }) => (
            <ScreenWithHeader title="Édition client" onBack={() => navigation.goBack()}>
              <ClientEditionScreen tableId={route.params.tableId} onBack={() => navigation.goBack()} />
            </ScreenWithHeader>
          )}
        </Stack.Screen>

        <Stack.Screen name="ConfigurateurSalle">
          {({ navigation }) => (
            <ScreenWithHeader title="Configurateur de salle" onBack={() => navigation.goBack()}>
              <RequirePermission permission="salle.configurer" message="Configuration de la salle réservée aux niveaux N2 et N3.">
                <ConfigurateurSalleScreen onBack={() => navigation.goBack()} />
              </RequirePermission>
            </ScreenWithHeader>
          )}
        </Stack.Screen>

        <Stack.Screen name="EspaceCuisine">
          {({ navigation }) => (
            <ScreenWithHeader title="Espace cuisine" onBack={() => navigation.goBack()}>
              <RequirePermission allowed={currentPole === "cuisine" || currentPole === "direction"} message="Cet espace est réservé au pôle cuisine.">
                <EspaceEquipeScreen
                  espace="cuisine"
                  onNavigate={(destination) =>
                    destination === "compte_rendu" ? navigation.navigate("CompteRendu", { pole: "cuisine" }) : naviguerVers(navigation, destination)
                  }
                />
              </RequirePermission>
            </ScreenWithHeader>
          )}
        </Stack.Screen>

        <Stack.Screen name="EspaceSalle">
          {({ navigation }) => (
            <ScreenWithHeader title="Espace équipe de salle" onBack={() => navigation.goBack()}>
              <RequirePermission allowed={currentPole === "salle" || currentPole === "direction"} message="Cet espace est réservé au pôle salle.">
                <EspaceEquipeScreen
                  espace="salle"
                  onNavigate={(destination) =>
                    destination === "compte_rendu" ? navigation.navigate("CompteRendu", { pole: "salle" }) : naviguerVers(navigation, destination)
                  }
                />
              </RequirePermission>
            </ScreenWithHeader>
          )}
        </Stack.Screen>

        <Stack.Screen name="EspaceDirection">
          {({ navigation }) => (
            <ScreenWithHeader title="Espace direction" onBack={() => navigation.goBack()}>
              <RequirePermission allowed={currentPole === "direction"} message="Cet espace est réservé à la direction.">
                <EspaceEquipeScreen espace="direction" onNavigate={(destination) => naviguerVers(navigation, destination)} />
              </RequirePermission>
            </ScreenWithHeader>
          )}
        </Stack.Screen>

        <Stack.Screen name="CompteRendu">
          {({ navigation, route }) => (
            <ScreenWithHeader title="Compte rendu du service" onBack={() => navigation.goBack()}>
              <RequirePermission
                permission={route.params.pole === "cuisine" ? "compte_rendu.cuisine" : "compte_rendu.salle"}
                message="Compte rendu réservé au responsable du pôle (N2)."
              >
                <CompteRenduScreen pole={route.params.pole} />
              </RequirePermission>
            </ScreenWithHeader>
          )}
        </Stack.Screen>

        <Stack.Screen name="ComptesRendusRecus">
          {({ navigation }) => (
            <ScreenWithHeader title="Comptes rendus reçus" onBack={() => navigation.goBack()}>
              <RequirePermission permission="compte_rendu.consulter" message="Accès réservé à la direction.">
                <ComptesRendusRecusScreen />
              </RequirePermission>
            </ScreenWithHeader>
          )}
        </Stack.Screen>

        <Stack.Screen name="ComptesEquipe">
          {({ navigation }) => (
            <ScreenWithHeader title="Comptes de l’équipe" onBack={() => navigation.goBack()}>
              <RequirePermission permission="comptes.gerer" message="Création de comptes réservée au directeur (N3).">
                <ComptesEquipeScreen />
              </RequirePermission>
            </ScreenWithHeader>
          )}
        </Stack.Screen>

        <Stack.Screen name="Delegations">
          {({ navigation }) => (
            <ScreenWithHeader title="Délégation des tâches" onBack={() => navigation.goBack()}>
              <RequirePermission permission="delegations.gerer" message="Délégations réservées au directeur (N3).">
                <DelegationsScreen />
              </RequirePermission>
            </ScreenWithHeader>
          )}
        </Stack.Screen>

        <Stack.Screen name="JournalAudit">
          {({ navigation }) => (
            <ScreenWithHeader title="Journal d’audit" onBack={() => navigation.goBack()}>
              <RequirePermission permission="audit.consulter" message="Journal réservé au directeur (N3).">
                <JournalAuditScreen />
              </RequirePermission>
            </ScreenWithHeader>
          )}
        </Stack.Screen>

        <Stack.Screen name="CommandesCuisine">
          {({ navigation }) => (
            <ScreenWithHeader title="Suivi des plats" onBack={() => navigation.goBack()}>
              <CommandesCuisineScreen />
            </ScreenWithHeader>
          )}
        </Stack.Screen>

        <Stack.Screen name="Stock">
          {({ navigation }) => (
            <ScreenWithHeader title="Gestion des stocks" onBack={() => navigation.goBack()}>
              <StockScreen onOpenItem={(itemId) => navigation.navigate("StockItem", { itemId })} />
            </ScreenWithHeader>
          )}
        </Stack.Screen>

        <Stack.Screen name="StockItem">
          {({ navigation, route }) => (
            <ScreenWithHeader title="Article en stock" onBack={() => navigation.goBack()}>
              <StockItemDetailScreen itemId={route.params.itemId} onDeleted={() => navigation.goBack()} />
            </ScreenWithHeader>
          )}
        </Stack.Screen>

        <Stack.Screen name="Menu">
          {({ navigation }) => (
            <ScreenWithHeader title="Gestion de la carte" onBack={() => navigation.goBack()}>
              <MenuScreen />
            </ScreenWithHeader>
          )}
        </Stack.Screen>

        <Stack.Screen name="Messagerie">
          {({ navigation }) => (
            <ScreenWithHeader title="Messagerie" onBack={() => navigation.goBack()}>
              <MessagerieScreen onOpenConversation={(conversationId, titre) => navigation.navigate("Conversation", { conversationId, titre })} />
            </ScreenWithHeader>
          )}
        </Stack.Screen>

        <Stack.Screen name="Conversation">
          {({ navigation, route }) => (
            <ScreenWithHeader title={route.params.titre} onBack={() => navigation.goBack()}>
              <ConversationScreen conversationId={route.params.conversationId} />
            </ScreenWithHeader>
          )}
        </Stack.Screen>

        <Stack.Screen name="InviterEquipier">
          {({ navigation }) => (
            <ScreenWithHeader title="Inviter un équipier" onBack={() => navigation.goBack()}>
              <RequirePermission permission="invitation.creer" message="Invitations réservées au directeur d’établissement (N3).">
                <InviterEquipierScreen onBack={() => navigation.goBack()} onOpenScanner={() => navigation.navigate("ScannerInvitation")} />
              </RequirePermission>
            </ScreenWithHeader>
          )}
        </Stack.Screen>

        <Stack.Screen name="ScannerInvitation">
          {({ navigation }) => (
            <ScreenWithHeader title="Scanner une invitation" onBack={() => navigation.goBack()}>
              <ScannerInvitationScreen onBack={() => navigation.goBack()} onAccessGranted={() => navigation.goBack()} />
            </ScreenWithHeader>
          )}
        </Stack.Screen>

        <Stack.Screen name="GestionAcces">
          {({ navigation }) => (
            <ScreenWithHeader title="Gestion des accès" onBack={() => navigation.goBack()}>
              <RequirePermission permission="acces.gerer" message="Gestion des accès réservée aux niveaux N2 et N3.">
                <GestionAccesScreen onBack={() => navigation.goBack()} onInvite={() => navigation.navigate("InviterEquipier")} />
              </RequirePermission>
            </ScreenWithHeader>
          )}
        </Stack.Screen>

        <Stack.Screen name="DevCreator">
          {({ navigation }) => (
            <ScreenWithHeader title="Console créateur" onBack={() => navigation.goBack()}>
              <RequirePermission allowed={canOpenCreatorPanel} message="Accès réservé au niveau N4.">
                <DevCreatorPanelScreen onBack={() => navigation.goBack()} />
              </RequirePermission>
            </ScreenWithHeader>
          )}
        </Stack.Screen>

        <Stack.Screen name="Checklist">
          {({ navigation }) => (
            <ScreenWithHeader title="Checklists HACCP" onBack={() => navigation.goBack()}>
              <ChecklistScreen />
            </ScreenWithHeader>
          )}
        </Stack.Screen>

        <Stack.Screen name="Reservations">
          {({ navigation }) => (
            <ScreenWithHeader title="Réservations du soir" onBack={() => navigation.goBack()}>
              <ReservationsScreen />
            </ScreenWithHeader>
          )}
        </Stack.Screen>

        <Stack.Screen name="TachesSalle">
          {({ navigation }) => (
            <ScreenWithHeader title="Tâches de salle" onBack={() => navigation.goBack()}>
              <TachesSalleScreen />
            </ScreenWithHeader>
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
