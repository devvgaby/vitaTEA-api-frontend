import React from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Screen, Card, Title } from "@/components/vitatea/ui";
import { colors, radius } from "@/constants/vitatea-theme";
import { useAuth } from "@/context/AuthContext";
import { useMonitorado } from "@/context/MonitoradoContext";

export default function ProfileScreen() {
  const { cuidador, logout } = useAuth();
  const { monitorados, monitoradoAtivo, selecionarMonitorado } = useMonitorado();
  const router = useRouter();

  function handleLogout() {
    Alert.alert("Sair da conta", "Deseja realmente sair?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: logout },
    ]);
  }

  return (
    <Screen>
      <View style={{ marginTop: 12, gap: 4, alignItems: "center" }}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={28} color={colors.primary} />
        </View>
        <Title>{cuidador?.nome}</Title>
        <Text style={styles.email}>{cuidador?.email}</Text>
      </View>

      {monitorados.length > 1 && (
        <View style={{ gap: 8 }}>
          <Text style={styles.sectionTitle}>Monitorados</Text>
          {monitorados.map((m) => (
            <Pressable key={m.id_monitorado} onPress={() => selecionarMonitorado(m)}>
              <Card
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  borderColor: monitoradoAtivo?.id_monitorado === m.id_monitorado ? colors.primary : colors.border,
                }}
              >
                <Text style={{ color: colors.text, flex: 1 }}>{m.nome}</Text>
                {monitoradoAtivo?.id_monitorado === m.id_monitorado && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                )}
              </Card>
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ gap: 8 }}>
        <Text style={styles.sectionTitle}>Conta</Text>
        <MenuItem icon="create-outline" label="Editar conta" onPress={() => router.push("/edit-account")} />
        <MenuItem icon="lock-closed-outline" label="Alterar senha" onPress={() => router.push("/change-password")} />
      </View>

      <View style={{ gap: 8 }}>
        <Text style={styles.sectionTitle}>Monitorado</Text>
        <MenuItem icon="person-add-outline" label="Cadastrar monitorado" onPress={() => router.push("/add-monitored")} />
        <MenuItem icon="hardware-chip-outline" label="Vincular dispositivo" onPress={() => router.push("/link-device")} />
        <MenuItem icon="options-outline" label="Configurar limites" onPress={() => router.push("/limits")} />
      </View>

      <Pressable onPress={handleLogout} style={styles.logoutButton}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </Pressable>
    </Screen>
  );
}

function MenuItem({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 }}>
        <Ionicons name={icon} size={20} color={colors.primary} />
        <Text style={{ color: colors.text, fontSize: 14, flex: 1 }}>{label}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  email: { color: colors.textMuted, fontSize: 13 },
  sectionTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.pill,
    paddingVertical: 14,
    marginTop: 8,
  },
  logoutText: { color: colors.danger, fontWeight: "600" },
});
