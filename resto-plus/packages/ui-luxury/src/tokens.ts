/**
 * Design tokens "Digital Luxury" — validés sur les maquettes accueil + plan de salle.
 * Fond crème dominant, accents or rares, touches gravées, typographie serif pour les
 * intitulés nobles, sans-serif pour le contenu fonctionnel.
 */

export const colors = {
  cream: "#F4EFE3",
  creamLight: "#EFE9D9",
  creamBorder: "#E3DCC9",
  navy: "#14213A",
  navyDeep: "#0A1220",
  gold: "#A38B4D",
  goldBright: "#C9A24B",
  textMuted: "#9A9483",
  statusFree: "#9BC17A",
  statusOccupied: "#C9A24B",
  statusReserved: "#C97A5A",
} as const;

export const typography = {
  serif: "PT Serif, Georgia, serif", // titres, noms d'espaces, valeurs nobles
  sans: "Inter, system-ui, sans-serif", // contenu fonctionnel, listes, données
  tracking: {
    label: 2, // labels en petites majuscules espacées ("ACCÈS RAPIDES")
    brand: 3, // wordmark ("PALACEOS")
  },
} as const;

export const radii = {
  sharp: 3,
  card: 6,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
