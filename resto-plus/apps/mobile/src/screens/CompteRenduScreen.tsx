import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, spacing, typography } from "@resto-plus/ui-luxury";
import type { CompteRenduLigneStock, CompteRenduService, JourneeService, PoleService, ValidationPole } from "@resto-plus/types";
import { api, messageErreur } from "../api/client";
import { useStockStore } from "../store/stockStore";

/**
 * Compte rendu du service — Resto Plus
 *
 * CompteRenduScreen : le N2 d'un pôle vérifie le compte rendu généré par l'app, peut
 * annuler une sortie de stock contestée (cuisine), ajoute ses observations et valide.
 * La validation confirme les sorties de stock et transmet le compte rendu au N3.
 * ComptesRendusRecusScreen : ce que reçoit la direction.
 * Ces écrans demandent le réseau : la validation engage la comptabilité, elle ne
 * passe pas par la file hors ligne.
 */

const TYPE_LABEL: Record<CompteRenduLigneStock["type"], string> = {
  reception: "Réception",
  sortie: "Sortie",
  perte: "Perte",
  ajustement: "Ajustement",
};

function euros(valeur: number | undefined) {
  return `${(valeur ?? 0).toFixed(2).replace(".", ",")} €`;
}

function dateHeure(iso: string | undefined) {
  return iso ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
}

/** « vendredi 25 septembre » à partir d'une journée de service AAAA-MM-JJ. */
function jourLisible(jour: string) {
  return new Date(`${jour}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function quantite(ligne: CompteRenduLigneStock) {
  const valeur = Math.round(Math.abs(ligne.delta) * 1000) / 1000;
  return `${ligne.delta < 0 ? "−" : "+"}${valeur} ${ligne.unite}`;
}

/** Contenu d'un compte rendu, partagé entre le N2 (brouillon) et le N3 (reçu). */
function CompteRenduContenu({ compteRendu, onAnnulerLigne }: { compteRendu: CompteRenduService; onAnnulerLigne?: (movementId: string) => void }) {
  return (
    <View>
      <View style={styles.kpiRow}>
        <Kpi label="Chiffre d’affaires estimé" value={euros(compteRendu.chiffreAffairesEstime)} />
        {compteRendu.pole === "salle" ? (
          <>
            <Kpi label="Couverts réservés" value={String(compteRendu.totalCouverts ?? 0)} />
            <Kpi label="Additions" value={String(compteRendu.nbAdditions ?? 0)} />
          </>
        ) : (
          <>
            <Kpi label="Coût matière" value={euros(compteRendu.coutMatiereEstime)} />
            <Kpi label="Pertes" value={euros(compteRendu.valeurPertes)} />
          </>
        )}
      </View>
      {compteRendu.pole === "salle" && (
        <Text style={styles.meta}>{compteRendu.nbReservations ?? 0} réservations au planning</Text>
      )}

      <Text style={styles.sectionLabel}>PLATS COMMANDÉS</Text>
      {compteRendu.plats.length === 0 ? (
        <Text style={styles.empty}>Aucun plat commandé sur la période.</Text>
      ) : (
        compteRendu.plats.map((plat) => (
          <View key={plat.nom} style={styles.row}>
            <Text style={styles.rowLabel}>{plat.quantite}× {plat.nom}</Text>
            <Text style={styles.rowValue}>{euros(plat.chiffreAffaires)}</Text>
          </View>
        ))
      )}

      {compteRendu.pole === "cuisine" && (
        <>
          <Text style={styles.sectionLabel}>
            {compteRendu.statut === "valide" ? "SORTIES DE STOCK CONFIRMÉES" : "SORTIES DE STOCK À VÉRIFIER"}
          </Text>
          {(compteRendu.mouvementsStock ?? []).length === 0 ? (
            <Text style={styles.empty}>Aucune sortie de stock en attente.</Text>
          ) : (
            (compteRendu.mouvementsStock ?? []).map((ligne) => (
              <View key={ligne.movementId} style={styles.stockRow}>
                <View style={styles.stockMain}>
                  <Text style={styles.rowLabel}>{ligne.stockItemNom}</Text>
                  <Text style={styles.stockDetail}>
                    {TYPE_LABEL[ligne.type]} · {quantite(ligne)}
                    {ligne.coutEstime !== undefined ? ` · ${euros(ligne.coutEstime)}` : ""}
                  </Text>
                  {ligne.motif && <Text style={styles.stockMotif}>{ligne.motif}</Text>}
                  {ligne.jourService !== compteRendu.date && (
                    <Text style={styles.stockAncien}>Service du {jourLisible(ligne.jourService)}, resté sans compte rendu</Text>
                  )}
                </View>
                {onAnnulerLigne && (
                  <Pressable onPress={() => onAnnulerLigne(ligne.movementId)} hitSlop={8} style={styles.cancelButton}>
                    <Text style={styles.cancelLabel}>Annuler</Text>
                  </Pressable>
                )}
              </View>
            ))
          )}
        </>
      )}
    </View>
  );
}

function heure(iso: string | undefined) {
  return iso ? new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—";
}

function LigneValidation({ label, validation }: { label: string; validation?: ValidationPole }) {
  return (
    <View style={styles.clotureRow}>
      <Text style={styles.clotureLabel}>{label}</Text>
      <Text style={[styles.clotureStatut, validation ? styles.clotureOk : styles.clotureAttente]}>
        {validation
          ? `✓ ${heure(validation.valideAt)} · ${validation.valideParNom ?? "—"}${validation.valideParDelegation ? " (délégation)" : ""}`
          : "En attente"}
      </Text>
    </View>
  );
}

/**
 * État de clôture d'une journée : elle est close quand les deux responsables (salle et
 * cuisine) ont validé leur compte rendu. Sinon la bascule du petit matin sert de filet.
 */
function ClotureJournee({ journee, titre }: { journee: JourneeService; titre: string }) {
  return (
    <View style={[styles.cloture, journee.cloturee && styles.clotureFermee]}>
      <Text style={styles.clotureTitre}>{titre}</Text>
      <LigneValidation label="Compte rendu salle" validation={journee.salle} />
      <LigneValidation label="Compte rendu cuisine" validation={journee.cuisine} />
      <Text style={styles.clotureNote}>
        {journee.cloturee
          ? `Journée clôturée à ${heure(journee.clotureAt)} : ce qui a suivi compte pour le service suivant.`
          : "La journée sera clôturée quand les deux comptes rendus seront validés (à défaut, automatiquement à l’heure de fin de service)."}
      </Text>
    </View>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

export function CompteRenduScreen({ pole }: { pole: PoleService }) {
  const [brouillon, setBrouillon] = useState<CompteRenduService | null>(null);
  const [historique, setHistorique] = useState<CompteRenduService[]>([]);
  const [observations, setObservations] = useState("");
  const [valide, setValide] = useState<(CompteRenduService & { journee?: JourneeService }) | null>(null);
  const [journee, setJournee] = useState<JourneeService | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const loadStock = useStockStore((state) => state.loadStock);

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const [cr, recus, journees] = await Promise.all([
        api.get<CompteRenduService>(`/comptes-rendus/brouillon/${pole}`),
        api.get<CompteRenduService[]>(`/comptes-rendus?pole=${pole}`),
        api.get<{ courante: JourneeService }>("/journees"),
      ]);
      setBrouillon(cr);
      setHistorique(recus);
      setJournee(journees.courante);
      setError("");
    } catch (err) {
      setError(messageErreur(err));
    } finally {
      setLoading(false);
    }
  }, [pole]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const annulerLigne = async (movementId: string) => {
    try {
      await api.post(`/stock-movements/${movementId}/annuler`, {});
      void loadStock();
      await charger();
    } catch (err) {
      setError(messageErreur(err));
    }
  };

  const valider = async () => {
    setSubmitting(true);
    try {
      const cr = await api.post<CompteRenduService & { journee: JourneeService }>(`/comptes-rendus/${pole}/valider`, { observations });
      setValide(cr);
      setObservations("");
      setError("");
      if (pole === "cuisine") void loadStock();
      await charger();
    } catch (err) {
      setError(messageErreur(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !brouillon) {
    return <View style={styles.centered}><ActivityIndicator color={colors.gold} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>{pole === "cuisine" ? "CUISINE" : "SALLE"} · FIN DE JOURNÉE</Text>
      <Text style={styles.title}>Compte rendu du service</Text>
      <Text style={styles.subtitle}>
        {pole === "cuisine"
          ? "Généré par l’application. Vérifie les sorties de stock : ta validation les confirme en comptabilité et transmet le compte rendu à la direction."
          : "Généré par l’application. Vérifie-le, ajoute tes observations puis valide : il sera transmis à la direction."}
      </Text>

      {valide && (
        <View style={styles.success}>
          <Text style={styles.successTitle}>Compte rendu transmis à la direction</Text>
          <Text style={styles.successText}>Validé le {dateHeure(valide.valideAt)}{pole === "cuisine" ? " · sorties de stock confirmées" : ""}.</Text>
          <Text style={styles.successText}>
            {valide.journee?.cloturee
              ? `Les deux comptes rendus sont validés : la journée du ${jourLisible(valide.date)} est clôturée.`
              : `En attente du compte rendu ${pole === "cuisine" ? "salle" : "cuisine"} pour clôturer la journée du ${jourLisible(valide.date)}.`}
          </Text>
        </View>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}

      {brouillon && (
        <>
          <Text style={styles.serviceDay}>Service du {jourLisible(brouillon.date)}</Text>
          <Text style={styles.meta}>
            La journée de service se termine à {brouillon.heureBascule ?? 5}h le lendemain matin : un service qui déborde après minuit reste compté ici.
            {brouillon.periodeDebut ? ` Déjà validé une première fois à ${dateHeure(brouillon.periodeDebut)} : seul ce qui a suivi apparaît.` : ""}
          </Text>
          <CompteRenduContenu compteRendu={brouillon} onAnnulerLigne={pole === "cuisine" ? annulerLigne : undefined} />

          {journee && journee.date === brouillon.date && (
            <ClotureJournee journee={journee} titre="CLÔTURE DE LA JOURNÉE" />
          )}

          <Text style={styles.sectionLabel}>OBSERVATIONS DU RESPONSABLE</Text>
          <TextInput
            style={styles.textarea}
            value={observations}
            onChangeText={setObservations}
            multiline
            placeholder="Incidents, retours clients, écarts constatés…"
            placeholderTextColor={colors.textMuted}
          />
          <Pressable style={styles.primaryButton} onPress={valider} disabled={submitting}>
            <Text style={styles.primaryLabel}>{submitting ? "Validation…" : "Valider et transmettre à la direction"}</Text>
          </Pressable>
          <Pressable style={styles.refresh} onPress={() => void charger()}>
            <Text style={styles.refreshLabel}>Actualiser le compte rendu</Text>
          </Pressable>
        </>
      )}

      {historique.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>DERNIERS COMPTES RENDUS VALIDÉS</Text>
          {historique.slice(0, 5).map((cr) => (
            <Text key={cr.id} style={styles.historyRow}>
              {dateHeure(cr.valideAt)} · {euros(cr.chiffreAffairesEstime)} · {cr.valideParNom ?? "—"}
            </Text>
          ))}
        </>
      )}
    </ScrollView>
  );
}

export function ComptesRendusRecusScreen() {
  const [comptesRendus, setComptesRendus] = useState<CompteRenduService[]>([]);
  const [journees, setJournees] = useState<{ courante: JourneeService; historique: JourneeService[] } | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<CompteRenduService[]>("/comptes-rendus"),
      api.get<{ courante: JourneeService; historique: JourneeService[] }>("/journees"),
    ])
      .then(([data, etats]) => {
        setComptesRendus(data);
        setJournees(etats);
        setOuvert(data[0]?.id ?? null);
      })
      .catch((err) => setError(messageErreur(err)))
      .finally(() => setLoading(false));
  }, []);

  // Un groupe par journée de service, avec son état de clôture.
  const parJour = (journees?.historique ?? []).map((etat) => ({
    etat,
    comptesRendus: comptesRendus.filter((cr) => cr.date === etat.date),
  }));

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={colors.gold} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>DIRECTION</Text>
      <Text style={styles.title}>Comptes rendus reçus</Text>
      <Text style={styles.subtitle}>Validés en fin de journée par le chef de salle et le chef de cuisine.</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {journees && !parJour.some((groupe) => groupe.etat.date === journees.courante.date) && (
        <ClotureJournee journee={journees.courante} titre={`SERVICE EN COURS · ${jourLisible(journees.courante.date).toUpperCase()}`} />
      )}
      {!error && comptesRendus.length === 0 && <Text style={styles.empty}>Aucun compte rendu reçu pour le moment.</Text>}
      {parJour.map(({ etat, comptesRendus: duJour }) => (
        <View key={etat.date}>
          <View style={styles.jourHeader}>
            <Text style={styles.jourTitre}>Service du {jourLisible(etat.date)}</Text>
            <Text style={[styles.jourBadge, etat.cloturee ? styles.clotureOk : styles.clotureAttente]}>
              {etat.cloturee ? `Clôturée à ${heure(etat.clotureAt)}` : `Non clôturée · ${!etat.salle ? "salle" : "cuisine"} manquante`}
            </Text>
          </View>
          {duJour.map((cr) => (
            <View key={cr.id} style={styles.card}>
              <Pressable onPress={() => setOuvert(ouvert === cr.id ? null : cr.id)} style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{cr.pole === "cuisine" ? "Cuisine" : "Salle"}</Text>
                  <Text style={styles.cardMeta}>
                    Validé par {cr.valideParNom ?? "—"}{cr.valideParDelegation ? " (par délégation)" : ""} le {dateHeure(cr.valideAt)}
                  </Text>
                </View>
                <Text style={styles.chevron}>{ouvert === cr.id ? "−" : "+"}</Text>
              </Pressable>
              {ouvert === cr.id && (
                <View style={styles.cardBody}>
                  {cr.observations && <Text style={styles.observations}>« {cr.observations} »</Text>}
                  <CompteRenduContenu compteRendu={cr} />
                </View>
              )}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  eyebrow: { color: colors.gold, fontSize: 9, letterSpacing: 1.5, marginTop: spacing.md, marginBottom: spacing.sm },
  title: { color: colors.navy, fontFamily: typography.serif, fontSize: 25, marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: spacing.lg },
  meta: { color: colors.textMuted, fontSize: 10, lineHeight: 14, marginBottom: spacing.md },
  serviceDay: { color: colors.navy, fontFamily: typography.serif, fontSize: 16, marginBottom: 4, textTransform: "capitalize" },
  stockAncien: { color: colors.statusOccupied, fontSize: 10, marginTop: 2 },
  sectionLabel: { color: colors.gold, fontSize: 9, letterSpacing: typography.tracking.label, marginTop: spacing.xl, marginBottom: spacing.sm },
  kpiRow: { flexDirection: "row", gap: spacing.sm },
  kpi: { flex: 1, backgroundColor: colors.creamLight, borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, padding: spacing.sm },
  kpiValue: { color: colors.navy, fontFamily: typography.serif, fontSize: 16 },
  kpiLabel: { color: colors.textMuted, fontSize: 9, marginTop: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.creamBorder },
  rowLabel: { color: colors.navy, fontSize: 13, flexShrink: 1 },
  rowValue: { color: colors.textMuted, fontSize: 12 },
  stockRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.creamBorder },
  stockMain: { flex: 1 },
  stockDetail: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  stockMotif: { color: colors.textMuted, fontSize: 10, fontStyle: "italic", marginTop: 2 },
  cancelButton: { borderWidth: 1, borderColor: colors.statusReserved, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  cancelLabel: { color: colors.statusReserved, fontSize: 10, fontWeight: "600" },
  empty: { color: colors.textMuted, fontSize: 12 },
  textarea: { minHeight: 90, textAlignVertical: "top", borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, backgroundColor: colors.creamLight, color: colors.navy, padding: spacing.md },
  primaryButton: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radii.card, paddingVertical: 13, marginTop: spacing.lg },
  primaryLabel: { color: colors.gold, fontWeight: "600" },
  refresh: { alignItems: "center", paddingVertical: spacing.md },
  refreshLabel: { color: colors.textMuted, fontSize: 11, textDecorationLine: "underline" },
  success: { backgroundColor: colors.creamLight, borderWidth: 1, borderColor: colors.gold, borderRadius: radii.card, padding: spacing.md, marginBottom: spacing.md },
  successTitle: { color: colors.navy, fontSize: 13, fontWeight: "600" },
  successText: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  error: { color: colors.statusReserved, fontSize: 11, marginBottom: spacing.md },
  cloture: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, padding: spacing.md, marginTop: spacing.xl, backgroundColor: colors.creamLight },
  clotureFermee: { borderColor: colors.statusFree },
  clotureTitre: { color: colors.gold, fontSize: 9, letterSpacing: typography.tracking.label, marginBottom: spacing.sm },
  clotureRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, gap: spacing.sm },
  clotureLabel: { color: colors.navy, fontSize: 12 },
  clotureStatut: { fontSize: 11, flexShrink: 1, textAlign: "right" },
  clotureOk: { color: colors.statusFree },
  clotureAttente: { color: colors.statusOccupied },
  clotureNote: { color: colors.textMuted, fontSize: 10, lineHeight: 14, marginTop: spacing.sm },
  jourHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: spacing.lg, marginBottom: spacing.sm, gap: spacing.sm },
  jourTitre: { color: colors.navy, fontFamily: typography.serif, fontSize: 15, flexShrink: 1 },
  jourBadge: { fontSize: 10, fontWeight: "600" },
  historyRow: { color: colors.textMuted, fontSize: 11, paddingVertical: 4 },
  card: { backgroundColor: colors.creamLight, borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, marginBottom: spacing.sm },
  cardHeader: { flexDirection: "row", alignItems: "center", padding: spacing.md },
  cardTitle: { color: colors.navy, fontSize: 14, fontWeight: "600" },
  cardMeta: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  chevron: { color: colors.gold, fontSize: 20, width: 20, textAlign: "center" },
  cardBody: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  observations: { color: colors.navy, fontSize: 12, fontStyle: "italic", marginBottom: spacing.md },
});
