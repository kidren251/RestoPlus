import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Modal,
  TextInput,
} from "react-native";
import { colors, typography, radii, spacing } from "@resto-plus/ui-luxury";
import type { Reservation } from "@resto-plus/types";
import { api } from "../api/client";
import { enqueueSync } from "../store/syncStore";

// Données mockées — sera remplacé par l'API Supabase Phase 2
const MOCK_RESERVATIONS: Reservation[] = [
  {
    id: "r1",
    tableId: "t2",
    clientId: "client-fontaine",
    nomClient: "M. Fontaine",
    couverts: 2,
    heure: "19:30",
    allergenes: [],
    notes: "Anniversaire — prévoir bougie",
    source: "telephone",
    status: "installee",
    serviceEvents: [
      { id: "e1", reservationId: "r1", tableId: "t2", type: "arrivee", label: "Arrivée des clients", occurredAt: "2026-09-09T19:42:00.000Z" },
      { id: "e2", reservationId: "r1", tableId: "t2", type: "plat_servi", label: "Plats servis", occurredAt: "2026-09-09T20:22:00.000Z" },
    ],
  },
  {
    id: "r2",
    tableId: "t3",
    nomClient: "Mme Beaumont",
    couverts: 4,
    heure: "20:00",
    allergenes: ["gluten", "lactose"],
    notes: "",
  },
  {
    id: "r3",
    tableId: "t4",
    nomClient: "M. Renard",
    couverts: 6,
    heure: "20:30",
    allergenes: ["arachides"],
    notes: "Client régulier — table habituelle",
  },
  {
    id: "r4",
    tableId: "t6",
    nomClient: "Famille Moreau",
    couverts: 4,
    heure: "19:00",
    allergenes: [],
    notes: "",
  },
  {
    id: "r5",
    tableId: "t1",
    nomClient: "Mme Leclerc",
    couverts: 2,
    heure: "21:00",
    allergenes: ["fruits de mer"],
    notes: "VIP — compte fidélité",
  },
];

const ALLERGENE_COLORS: Record<string, string> = {
  gluten: "#E8A87C",
  lactose: "#A8C5DA",
  arachides: "#E88C8C",
  "fruits de mer": "#A8DAD0",
};

export function ReservationsScreen({ canEdit }: { canEdit: boolean }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [nomClient, setNomClient] = useState("");
  const [heure, setHeure] = useState("19:30");
  const [tableId, setTableId] = useState("t1");
  const [couverts, setCouverts] = useState("2");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get<Reservation[]>("/reservations");
        setReservations(data);
      } catch {
        setReservations(MOCK_RESERVATIONS);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const sorted = [...reservations].sort((a, b) =>
    a.heure.localeCompare(b.heure)
  );
  const vipCount = reservations.filter(
    (r) => r.notes?.toLowerCase().includes("vip") || r.allergenes.length > 0
  ).length;

  const ajouterReservation = () => {
    const nom = nomClient.trim();
    const nombre = Number.parseInt(couverts, 10);
    if (!nom || !/^([01]\d|2[0-3]):[0-5]\d$/.test(heure) || !Number.isInteger(nombre) || nombre < 1) {
      return;
    }
    const reservation: Reservation = {
      id: `local-${Date.now()}`,
      tableId: tableId.trim() || "t1",
      nomClient: nom,
      couverts: nombre,
      heure,
      allergenes: [],
      notes: notes.trim(),
    };
    setReservations((current) => [...current, reservation]);
    enqueueSync("reservation_create", reservation);
    setNomClient("");
    setNotes("");
    setShowForm(false);
  };

  const annulerReservation = (id: string) => {
    setReservations((current) => current.filter((reservation) => reservation.id !== id));
    enqueueSync("reservation_cancel", { id });
    setSelectedId(null);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Réservations du soir</Text>
            <Text style={styles.subtitle}>{reservations.length} réservations · {vipCount} attention requise</Text>
          </View>
          {canEdit && (
            <Pressable style={styles.addButton} onPress={() => setShowForm(true)}>
              <Text style={styles.addButtonLabel}>+</Text>
            </Pressable>
          )}
        </View>
      </View>

      <Text style={styles.sectionLabel}>PLANNING</Text>

      {sorted.map((res) => (
        <ReservationCard
          key={res.id}
          reservation={res}
          expanded={selectedId === res.id}
          onPress={() =>
            setSelectedId(selectedId === res.id ? null : res.id)
          }
          onCancel={canEdit ? () => annulerReservation(res.id) : undefined}
        />
      ))}

      <ReservationForm
        visible={showForm}
        nomClient={nomClient}
        heure={heure}
        tableId={tableId}
        couverts={couverts}
        notes={notes}
        onClose={() => setShowForm(false)}
        onSubmit={ajouterReservation}
        setNomClient={setNomClient}
        setHeure={setHeure}
        setTableId={setTableId}
        setCouverts={setCouverts}
        setNotes={setNotes}
      />
    </ScrollView>
  );
}

function ReservationCard({
  reservation,
  expanded,
  onPress,
  onCancel,
}: {
  reservation: Reservation;
  expanded: boolean;
  onPress: () => void;
  onCancel?: () => void;
}) {
  const hasAllergenes = reservation.allergenes.length > 0;
  const isVip = reservation.notes?.toLowerCase().includes("vip");

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardMain}>
        {/* Heure */}
        <View style={styles.heureBlock}>
          <Text style={styles.heure}>{reservation.heure}</Text>
        </View>

        {/* Infos client */}
        <View style={styles.clientBlock}>
          <View style={styles.clientRow}>
            <Text style={styles.clientNom}>{reservation.nomClient}</Text>
            {isVip && <Text style={styles.vipBadge}>VIP</Text>}
          </View>
          <Text style={styles.couverts}>
            {reservation.couverts} couvert{reservation.couverts > 1 ? "s" : ""}
            {" · "}
            Table {reservation.tableId.replace("t", "")}
          </Text>
        </View>

        {/* Indicateurs */}
        <View style={styles.indicateurs}>
          {hasAllergenes && (
            <View style={styles.alertDot}>
              <Text style={styles.alertDotText}>⚠</Text>
            </View>
          )}
        </View>
      </View>

      {/* Détail déroulant */}
      {expanded && (
        <View style={styles.cardDetail}>
          {hasAllergenes && (
            <View style={styles.allergenesSection}>
              <Text style={styles.detailLabel}>ALLERGÈNES</Text>
              <View style={styles.allergenesList}>
                {reservation.allergenes.map((a) => (
                  <View
                    key={a}
                    style={[
                      styles.allergeneBadge,
                      { backgroundColor: ALLERGENE_COLORS[a] ?? colors.creamBorder },
                    ]}
                  >
                    <Text style={styles.allergeneText}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {reservation.notes ? (
            <View>
              <Text style={styles.detailLabel}>NOTES</Text>
              <Text style={styles.notes}>{reservation.notes}</Text>
            </View>
          ) : null}
          {reservation.source && (
            <Text style={styles.metadata}>Réservation par {reservation.source.replace("_", " ")}</Text>
          )}
          {reservation.serviceEvents && reservation.serviceEvents.length > 0 && (
            <View>
              <Text style={styles.detailLabel}>DÉROULÉ DU DÎNER</Text>
              {reservation.serviceEvents.map((event) => (
                <View key={event.id} style={styles.timelineRow}>
                  <Text style={styles.timelineTime}>{new Date(event.occurredAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</Text>
                  <Text style={styles.timelineLabel}>{event.label}</Text>
                </View>
              ))}
            </View>
          )}
          {onCancel && (
            <Pressable onPress={onCancel} style={styles.cancelButton}>
              <Text style={styles.cancelLabel}>Annuler cette réservation</Text>
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
}

function ReservationForm({
  visible,
  nomClient,
  heure,
  tableId,
  couverts,
  notes,
  onClose,
  onSubmit,
  setNomClient,
  setHeure,
  setTableId,
  setCouverts,
  setNotes,
}: {
  visible: boolean;
  nomClient: string;
  heure: string;
  tableId: string;
  couverts: string;
  notes: string;
  onClose: () => void;
  onSubmit: () => void;
  setNomClient: (value: string) => void;
  setHeure: (value: string) => void;
  setTableId: (value: string) => void;
  setCouverts: (value: string) => void;
  setNotes: (value: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.form}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Nouvelle réservation</Text>
            <Pressable onPress={onClose}><Text style={styles.closeLabel}>✕</Text></Pressable>
          </View>
          <Text style={styles.formLabel}>Nom du client</Text>
          <TextInput style={styles.input} value={nomClient} onChangeText={setNomClient} placeholder="Nom" />
          <View style={styles.formRow}>
            <View style={styles.formHalf}><Text style={styles.formLabel}>Heure</Text><TextInput style={styles.input} value={heure} onChangeText={setHeure} keyboardType="numbers-and-punctuation" placeholder="19:30" /></View>
            <View style={styles.formHalf}><Text style={styles.formLabel}>Couverts</Text><TextInput style={styles.input} value={couverts} onChangeText={setCouverts} keyboardType="number-pad" /></View>
          </View>
          <Text style={styles.formLabel}>Table</Text>
          <TextInput style={styles.input} value={tableId} onChangeText={setTableId} placeholder="t1" />
          <Text style={styles.formLabel}>Note</Text>
          <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder="Optionnel" />
          <Pressable style={styles.submitButton} onPress={onSubmit}><Text style={styles.submitLabel}>Ajouter</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cream,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: {
    fontFamily: typography.serif,
    fontSize: 20,
    color: colors.navy,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textMuted,
  },
  addButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" },
  addButtonLabel: { color: colors.gold, fontSize: 24, lineHeight: 26, fontWeight: "300" },
  sectionLabel: {
    fontSize: 9,
    letterSpacing: typography.tracking.label,
    color: colors.gold,
    marginBottom: spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.card,
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  cardMain: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.creamLight,
  },
  heureBlock: {
    width: 48,
    marginRight: spacing.md,
  },
  heure: {
    fontFamily: typography.serif,
    fontSize: 14,
    color: colors.gold,
    letterSpacing: 0.5,
  },
  clientBlock: {
    flex: 1,
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 2,
  },
  clientNom: {
    fontSize: 13,
    color: colors.navy,
    fontWeight: "500",
  },
  vipBadge: {
    fontSize: 8,
    letterSpacing: 1,
    color: colors.gold,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  couverts: {
    fontSize: 11,
    color: colors.textMuted,
  },
  indicateurs: {
    alignItems: "flex-end",
  },
  alertDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.statusReserved + "30",
    alignItems: "center",
    justifyContent: "center",
  },
  alertDotText: {
    fontSize: 10,
    color: colors.statusReserved,
  },
  cardDetail: {
    padding: spacing.md,
    backgroundColor: colors.cream,
    borderTopWidth: 1,
    borderTopColor: colors.creamBorder,
    gap: spacing.sm,
  },
  allergenesSection: {},
  detailLabel: {
    fontSize: 8,
    letterSpacing: typography.tracking.label,
    color: colors.gold,
    marginBottom: spacing.xs,
  },
  allergenesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  allergeneBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  allergeneText: {
    fontSize: 10,
    color: colors.navy,
    fontWeight: "500",
  },
  notes: {
    fontSize: 12,
    color: colors.navy,
    lineHeight: 17,
    fontStyle: "italic",
  },
  metadata: { fontSize: 11, color: colors.textMuted },
  timelineRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 5 },
  timelineTime: { width: 42, color: colors.gold, fontFamily: typography.serif, fontSize: 12 },
  timelineLabel: { color: colors.navy, fontSize: 11 },
  cancelButton: { alignSelf: "flex-start", marginTop: spacing.sm },
  cancelLabel: { color: colors.statusOccupied, fontSize: 11 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(11,30,51,0.35)" },
  form: { backgroundColor: colors.cream, padding: spacing.lg, borderTopLeftRadius: radii.card, borderTopRightRadius: radii.card },
  formHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  formTitle: { fontFamily: typography.serif, fontSize: 18, color: colors.navy },
  closeLabel: { color: colors.navy, fontSize: 16, padding: spacing.xs },
  formLabel: { color: colors.textMuted, fontSize: 10, marginBottom: 4, marginTop: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.creamBorder, backgroundColor: colors.creamLight, borderRadius: radii.card, paddingHorizontal: spacing.sm, paddingVertical: 9, color: colors.navy },
  formRow: { flexDirection: "row", gap: spacing.sm },
  formHalf: { flex: 1 },
  submitButton: { backgroundColor: colors.navy, borderRadius: radii.card, alignItems: "center", paddingVertical: 12, marginTop: spacing.lg },
  submitLabel: { color: colors.gold, fontWeight: "600" },
});
