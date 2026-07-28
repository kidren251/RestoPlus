/**
 * Resto Plus / PalaceOS — Point d'entrée de l'app mobile.
 *
 * Ordre d'initialisation :
 * 1. GestureHandlerRootView (requis par react-native-gesture-handler)
 * 2. Initialisation du SyncEngine (hydrate queue + écoute réseau)
 * 3. Chargement initial des données (checklists au démarrage)
 * 4. Rendu du navigateur principal
 */

import "react-native-gesture-handler"; // doit être le 1er import

import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";
import { useSyncStore } from "./src/store/syncStore";
import { useChecklistStore } from "./src/store/checklistStore";
import { AppNavigator } from "./src/navigation/AppNavigator";

export default function App() {
  const initSync = useSyncStore((s) => s.init);
  const loadChecklists = useChecklistStore((s) => s.loadChecklists);

  useEffect(() => {
    void initSync();
    void loadChecklists();
  }, [initSync, loadChecklists]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <AppNavigator />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
