import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { colors, radii, spacing, typography } from "@resto-plus/ui-luxury";
import type { CompteEquipe, PoleService, ResumeUtilisateurs } from "@resto-plus/types";
import { api, messageErreur } from "../api/client";

/**
 * Comptes de l'équipe — panneau du directeur (N3)
 *
 * Crée des comptes permanents N0-N2. Chaque compte reçoit un code d'activation à usage
 * unique (7 jours) que l'employé saisit à sa première connexion (« Activer mon
 * compte »). Distinct de l'accès intérimaire par QR, qui est temporaire.
 * Le résumé en tête (permanents / intérimaires) est la base de la facturation par utilisateur.
 */

type Niveau = "serveur" | "chef_rang" | "manager_admin";

const NIVEAUX: { id: Niveau; label: string }[] = [
  { id: "serveur", label: "N0" },
  { id: "chef_rang", label: "N1" },
  { id: "manager_admin", label: "N2" },
];

const LIBELLE_NIVEAU: Record<PoleService, Record<Niveau, string>> = {
  salle: { serveur: "Serveur (N0)", chef_rang: "Chef de rang (N1)", manager_admin: "Manager de salle (N2)" },
  cuisine: { serveur: "Commis (N0)", chef_rang: "Chef de partie (N1)", manager_admin: "Chef de cuisine (N2)" },
};

const LIBELLE_STATUT: Record<CompteEquipe["statut"], string> = {
  en_attente_activation: "En attente d’activation",
  actif: "Actif",
  desactive: "Désactivé",
};

type CodeAffiche = { compte: CompteEquipe; codeActivation: string };

function libelleNiveau(compte: CompteEquipe) {
  if (compte.pole === "direction" || compte.accessRole === "directeur_admin") return "Direction (N3)";
  return LIBELLE_NIVEAU[compte.pole][compte.accessRole];
}

export function ComptesEquipeScreen() {
  const [comptes, setComptes] = useState<CompteEquipe[]>([]);
  const [resume, setResume] = useState<ResumeUtilisateurs | null>(null);
  const [nom, setNom] = useState("");
  const [niveau, setNiveau] = useState<Niveau>("serveur");
  const [pole, setPole] = useState<PoleService>("salle");
  const [messagerie, setMessagerie] = useState(true);
  const [codeAffiche, setCodeAffiche] = useState<CodeAffiche | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const charger = useCallback(async () => {
    try {
      const data = await api.get<{ comptes: CompteEquipe[]; resume: ResumeUtilisateurs }>("/comptes");
      setComptes(data.comptes);
      setResume(data.resume);
      setError("");
    } catch (err) {
      setError(messageErreur(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const creer = async () => {
    if (!nom.trim()) {
      setError("Indique le nom de l’employé.");
      return;
    }
    try {
      const result = await api.post<CodeAffiche>("/comptes", { nom: nom.trim(), accessRole: niveau, pole, messagerie });
      setCodeAffiche(result);
      setNom("");
      await charger();
    } catch (err) {
      setError(messageErreur(err));
    }
  };

  const action = async (path: string, afficheCode: boolean, body: object = {}) => {
    try {
      const result = await api.post<CodeAffiche>(path, body);
      if (afficheCode) setCodeAffiche(result);
      await charger();
    } catch (err) {
      setError(messageErreur(err));
    }
  };

  const partager = (code: CodeAffiche) => {
    void Share.share({
      message:
        `Bonjour ${code.compte.nom}, voici ton accès à Resto Plus.\n` +
        `1. Installe l'application.\n2. Touche « Première connexion ? Activer mon compte ».\n` +
        `3. Saisis ce code : ${code.codeActivation}\n(valable 7 jours, usage unique)`,
    });
  };

  // La direction ne se gère pas elle-même ici.
  const equipe = comptes.filter((compte) => compte.accessRole !== "directeur_admin");

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={colors.gold} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>DIRECTION · N3</Text>
      <Text style={styles.title}>Comptes de l’équipe</Text>
      <Text style={styles.subtitle}>Crée un compte permanent pour chaque employé : il l’active lui-même à sa première connexion avec le code fourni. Tu règles ici son accès à la messagerie.</Text>

      {resume && (
        <View style={styles.kpiRow}>
          <Kpi value={resume.permanentsActifs} label="Utilisateurs actifs" />
          <Kpi value={resume.enAttenteActivation} label="En attente d’activation" />
          <Kpi value={resume.interimairesActifs} label="Intérimaires en cours" />
        </View>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}

      {codeAffiche && (
        <View style={styles.codeCard}>
          <Text style={styles.codeTitle}>Code d’activation de {codeAffiche.compte.nom}</Text>
          <Text style={styles.code} selectable>{codeAffiche.codeActivation}</Text>
          <Text style={styles.codeNote}>
            À transmettre à l’employé. Valable 7 jours, usage unique. Il ne sera plus affiché ensuite : en cas de perte, génère un nouveau code.
          </Text>
          <View style={styles.codeActions}>
            <Pressable style={styles.shareButton} onPress={() => partager(codeAffiche)}>
              <Text style={styles.shareLabel}>Envoyer le code</Text>
            </Pressable>
            <Pressable style={styles.closeButton} onPress={() => setCodeAffiche(null)}>
              <Text style={styles.closeLabel}>Fermer</Text>
            </Pressable>
          </View>
        </View>
      )}

      <Text style={styles.sectionLabel}>NOUVEAU COMPTE</Text>
      <View style={styles.form}>
        <Text style={styles.label}>Nom et prénom</Text>
        <TextInput style={styles.input} value={nom} onChangeText={setNom} placeholder="ex : Julie Moreau" placeholderTextColor={colors.textMuted} />
        <Text style={styles.label}>Pôle</Text>
        <View style={styles.choiceRow}>
          {(["salle", "cuisine"] as const).map((option) => (
            <Pressable key={option} style={[styles.choice, pole === option && styles.choiceActive]} onPress={() => setPole(option)}>
              <Text style={[styles.choiceLabel, pole === option && styles.choiceLabelActive]}>{option === "salle" ? "Salle" : "Cuisine"}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Niveau d’accès</Text>
        <View style={styles.choiceRow}>
          {NIVEAUX.map((option) => (
            <Pressable key={option.id} style={[styles.choice, niveau === option.id && styles.choiceActive]} onPress={() => setNiveau(option.id)}>
              <Text style={[styles.choiceLabel, niveau === option.id && styles.choiceLabelActive]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.niveauHint}>{LIBELLE_NIVEAU[pole][niveau]}</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Accès à la messagerie</Text>
          <Switch value={messagerie} onValueChange={setMessagerie} trackColor={{ true: colors.gold, false: colors.creamBorder }} />
        </View>
        <Pressable style={styles.primaryButton} onPress={creer}>
          <Text style={styles.primaryLabel}>Créer le compte et obtenir le code</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>COMPTES · {equipe.length}</Text>
      {equipe.length === 0 && <Text style={styles.empty}>Aucun compte créé pour le moment.</Text>}
      {equipe.map((compte) => (
        <View key={compte.id} style={styles.memberCard}>
          <View style={styles.memberMain}>
            <Text style={styles.memberName}>{compte.nom}</Text>
            <Text style={styles.memberMeta}>{libelleNiveau(compte)} · {compte.pole === "salle" ? "Salle" : "Cuisine"}{compte.demo ? " · compte de démo" : ""}</Text>
            <Text style={[styles.memberStatut, compte.statut === "actif" ? styles.actif : compte.statut === "desactive" ? styles.desactive : styles.attente]}>
              {LIBELLE_STATUT[compte.statut]}{compte.login ? ` · identifiant ${compte.login}` : ""}
            </Text>
          </View>
          <View style={styles.memberActions}>
            {compte.statut !== "desactive" && (
              <View style={styles.memberSwitch}>
                <Text style={styles.memberSwitchLabel}>Messagerie</Text>
                <Switch
                  value={compte.messagerie}
                  onValueChange={(active) => void action(`/comptes/${compte.id}/messagerie`, false, { active })}
                  trackColor={{ true: colors.gold, false: colors.creamBorder }}
                />
              </View>
            )}
            {compte.statut === "en_attente_activation" && (
              <Pressable onPress={() => void action(`/comptes/${compte.id}/code`, true)} hitSlop={6}>
                <Text style={styles.link}>Nouveau code</Text>
              </Pressable>
            )}
            {compte.statut !== "desactive" && !compte.demo && (
              <Pressable onPress={() => void action(`/comptes/${compte.id}/desactiver`, false)} hitSlop={6}>
                <Text style={styles.linkDanger}>Désactiver</Text>
              </Pressable>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function Kpi({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  eyebrow: { color: colors.gold, fontSize: 9, letterSpacing: 1.5, marginTop: spacing.md, marginBottom: spacing.sm },
  title: { color: colors.navy, fontFamily: typography.serif, fontSize: 25, marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: spacing.lg },
  kpiRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  kpi: { flex: 1, backgroundColor: colors.creamLight, borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, padding: spacing.sm },
  kpiValue: { color: colors.navy, fontFamily: typography.serif, fontSize: 20 },
  kpiLabel: { color: colors.textMuted, fontSize: 9, marginTop: 2 },
  error: { color: colors.statusReserved, fontSize: 11, marginBottom: spacing.md },
  codeCard: { backgroundColor: colors.navy, borderRadius: radii.card, padding: spacing.lg, marginBottom: spacing.md },
  codeTitle: { color: colors.cream, fontSize: 12 },
  code: { color: colors.gold, fontSize: 26, letterSpacing: 3, textAlign: "center", marginVertical: spacing.md, fontWeight: "700" },
  codeNote: { color: colors.cream, fontSize: 10, lineHeight: 15, opacity: 0.8 },
  codeActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  shareButton: { flex: 1, alignItems: "center", backgroundColor: colors.gold, borderRadius: radii.card, paddingVertical: 10 },
  shareLabel: { color: colors.navy, fontWeight: "600", fontSize: 12 },
  closeButton: { flex: 1, alignItems: "center", borderWidth: 1, borderColor: colors.gold, borderRadius: radii.card, paddingVertical: 10 },
  closeLabel: { color: colors.gold, fontSize: 12 },
  sectionLabel: { color: colors.gold, fontSize: 9, letterSpacing: typography.tracking.label, marginTop: spacing.lg, marginBottom: spacing.sm },
  form: { borderTopWidth: 1, borderTopColor: colors.creamBorder, paddingTop: spacing.sm },
  label: { color: colors.textMuted, fontSize: 10, marginTop: spacing.md, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, backgroundColor: colors.creamLight, color: colors.navy, paddingHorizontal: spacing.md, paddingVertical: 11 },
  choiceRow: { flexDirection: "row", gap: spacing.xs },
  choice: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 7 },
  choiceActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  choiceLabel: { color: colors.textMuted, fontSize: 12 },
  choiceLabelActive: { color: colors.gold },
  niveauHint: { color: colors.navy, fontSize: 11, marginTop: spacing.sm },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.md },
  switchLabel: { color: colors.navy, fontSize: 12 },
  memberSwitch: { flexDirection: "row", alignItems: "center", gap: 4 },
  memberSwitchLabel: { color: colors.textMuted, fontSize: 10 },
  primaryButton: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radii.card, paddingVertical: 13, marginTop: spacing.lg },
  primaryLabel: { color: colors.gold, fontWeight: "600" },
  empty: { color: colors.textMuted, fontSize: 12 },
  memberCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.creamLight, borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, padding: spacing.md, marginBottom: spacing.sm },
  memberMain: { flex: 1 },
  memberName: { color: colors.navy, fontSize: 13, fontWeight: "600" },
  memberMeta: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  memberStatut: { fontSize: 10, marginTop: 3 },
  actif: { color: colors.statusFree },
  attente: { color: colors.statusOccupied },
  desactive: { color: colors.textMuted },
  memberActions: { alignItems: "flex-end", gap: spacing.sm },
  link: { color: colors.navy, fontSize: 11, textDecorationLine: "underline" },
  linkDanger: { color: colors.statusReserved, fontSize: 11 },
});
