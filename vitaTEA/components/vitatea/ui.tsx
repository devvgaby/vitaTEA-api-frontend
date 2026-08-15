import React from "react";
import { View, Text, StyleSheet, ScrollView, ViewProps, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, criticidade, NivelCriticidade } from "@/constants/vitatea-theme";

export function Screen({
  children,
  scroll = true,
  onRefresh,
  refreshing,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.scrollContent}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {content}
    </SafeAreaView>
  );
}

export function Card({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function Badge({ nivel }: { nivel: NivelCriticidade }) {
  const c = criticidade[nivel];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon?: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <View style={styles.empty}>
      {icon}
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorBannerText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: 20, gap: 16, flexGrow: 1 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 10,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: "700" },
  subtitle: { color: colors.textMuted, fontSize: 14 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: "flex-start" },
  badgeText: { fontSize: 12, fontWeight: "700" },
  empty: { alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 48 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "600" },
  emptySubtitle: { color: colors.textMuted, fontSize: 13, textAlign: "center", paddingHorizontal: 32 },
  errorBanner: {
    backgroundColor: colors.dangerMuted,
    borderRadius: radius.input,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorBannerText: { color: colors.danger, fontSize: 13 },
});
