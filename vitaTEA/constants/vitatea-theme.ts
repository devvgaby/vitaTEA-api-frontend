export const colors = {
  bg: "#0F0F1E",
  bgOuter: "#050510",
  card: "#1A1A2E",
  border: "#2A2A40",
  text: "#F5F5FA",
  textMuted: "#8A8AA0",
  inputBg: "#1A1A2E",
  primary: "#7C3AED",
  primaryMuted: "#7C3AED26",
  accent: "#06B6D4",
  danger: "#EF4444",
  dangerMuted: "#EF444426",
  warning: "#F59E0B",
  warningMuted: "#F59E0B26",
  success: "#10B981",
  successMuted: "#10B98126",
  white: "#FFFFFF",
};

export const radius = {
  card: 18,
  pill: 999,
  input: 14,
};

export const spacing = (n: number) => n * 4;

export const criticidade = {
  baixo: { color: colors.success, bg: colors.successMuted, label: "Baixo" },
  medio: { color: colors.warning, bg: colors.warningMuted, label: "Médio" },
  alto: { color: "#F97316", bg: "#F9731626", label: "Alto" },
  critico: { color: colors.danger, bg: colors.dangerMuted, label: "Crítico" },
} as const;

export type NivelCriticidade = keyof typeof criticidade;
