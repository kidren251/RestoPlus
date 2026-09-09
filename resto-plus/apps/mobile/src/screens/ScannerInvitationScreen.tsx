import React, { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { colors, spacing, typography } from "@resto-plus/ui-luxury";
import { api } from "../api/client";

export function ScannerInvitationScreen({ onBack, onAccessGranted }: { onBack: () => void; onAccessGranted?: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [token, setToken] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [scanned, setScanned] = useState(false);

  if (!permission) return <View style={styles.center}><Text>Préparation de la caméra…</Text></View>;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Autoriser la caméra</Text>
        <Text style={styles.subtitle}>Elle sert uniquement à scanner une invitation Restau Plus.</Text>
        <Button title="Autoriser" onPress={() => void requestPermission()} />
        <Button title="Retour" onPress={onBack} />
      </View>
    );
  }

  const redeem = async () => {
    if (!token || !displayName.trim()) return;
    try {
      await api.post("/invitations/redeem", { token, displayName });
      setMessage("Invitation acceptée. Accès serveur activé.");
      onAccessGranted?.();
    } catch {
      setMessage("Invitation invalide, expirée ou déjà utilisée.");
    }
  };

  return (
    <View style={styles.container}>
      {!token && !scanned && (
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={({ data }) => {
            setScanned(true);
            setToken(data.replace("resto-plus://join/", ""));
          }}
        />
      )}
      {token && (
        <View style={styles.form}>
          <Text style={styles.eyebrow}>INVITATION RESTO PLUS</Text>
          <Text style={styles.title}>Rejoindre l’équipe</Text>
          <Text style={styles.subtitle}>Ton accès sera limité au rôle serveur du restaurant invité.</Text>
          <TextInput style={styles.input} placeholder="Ton nom" value={displayName} onChangeText={setDisplayName} />
          <Button title="Activer mon accès" onPress={() => void redeem()} />
          {!!message && <Text style={styles.message}>{message}</Text>}
          <Button title="Scanner un autre code" onPress={() => { setToken(null); setScanned(false); setMessage(""); }} />
        </View>
      )}
      <Button title="Retour" onPress={onBack} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  camera: { flex: 1, margin: spacing.lg, maxHeight: 420 },
  form: { padding: spacing.lg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.lg, backgroundColor: colors.cream },
  eyebrow: { color: colors.gold, fontSize: 9, letterSpacing: 1.5, marginBottom: spacing.sm },
  title: { color: colors.navy, fontFamily: typography.serif, fontSize: 24, marginBottom: spacing.sm },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: spacing.lg },
  input: { borderWidth: 1, borderColor: colors.creamBorder, color: colors.navy, padding: 12, marginBottom: spacing.md },
  message: { color: colors.navy, fontSize: 12, marginVertical: spacing.md },
});
