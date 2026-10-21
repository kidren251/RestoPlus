import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * Hauteur du clavier affiché (0 s'il est fermé).
 * Sur Android, l'app est affichée bord à bord (Expo SDK 57) : la fenêtre n'est plus
 * redimensionnée à l'ouverture du clavier et KeyboardAvoidingView ne suffit pas. On
 * applique donc soi-même cette hauteur en marge basse pour garder la zone de saisie visible.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    // iOS prévient avant l'animation (plus fluide) ; Android seulement après.
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (event) => setHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
