import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors, typography, spacing } from "@resto-plus/ui-luxury";
import { AccueilScreen } from "../screens/AccueilScreen";
import { PlanSalleScreen } from "../screens/PlanSalleScreen";
import { ChecklistScreen } from "../screens/ChecklistScreen";
import { ReservationsScreen } from "../screens/ReservationsScreen";
import { useSalleStore } from "../store/salleStore";
import { useChecklistStore } from "../store/checklistStore";

export type RootStackParamList = {
  Accueil: undefined;
  PlanSalle: undefined;
  Checklist: undefined;
  Reservations: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function CustomHeader({
  title,
  onBack,
}: {
  title: string;
  onBack?: () => void;
}) {
  return (
    <View style={headerStyles.container}>
      {onBack ? (
        <Pressable onPress={onBack} style={headerStyles.backBtn} hitSlop={12}>
          <Text style={headerStyles.backIcon}>←</Text>
        </Pressable>
      ) : (
        <View style={headerStyles.backBtn} />
      )}
      <Text style={headerStyles.title}>{title}</Text>
      <View style={headerStyles.backBtn} />
    </View>
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
    width: 32,
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
});

export function AppNavigator() {
  const { salle, loadSalle, setStatutTable, moveTable } = useSalleStore();
  const { getNombreEnAttente } = useChecklistStore();

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
                }
              }}
              checklistsEnAttente={getNombreEnAttente()}
              arriveesVip={0}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="PlanSalle">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <CustomHeader
                title="Plan de salle"
                onBack={() => navigation.goBack()}
              />
              <PlanSalleScreen
                nomSalle={salle?.nom ?? "Salle principale"}
                tables={salle?.tables ?? []}
                decor={salle?.decor ?? []}
                editable={false}
                onTablePress={(id) => {
                  // Phase 2 : ouvrir fiche table
                  console.log("Table sélectionnée:", id);
                }}
                onTableMove={(id, x, y) => moveTable(id, x, y)}
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
