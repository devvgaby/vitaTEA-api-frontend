import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Screen, Subtitle, ErrorBanner, EmptyState } from "@/components/vitatea/ui";
import { ModalHeader } from "@/components/vitatea/modal-header";
import { TextField } from "@/components/vitatea/text-field";
import { Button } from "@/components/vitatea/button";
import { colors } from "@/constants/vitatea-theme";
import { useMonitorado } from "@/context/MonitoradoContext";
import { vincularDispositivo } from "@/lib/api/dispositivos";
import { extrairErro } from "@/lib/api/client";

export default function LinkDeviceScreen() {
  const router = useRouter();
  const { monitoradoAtivo, recarregar } = useMonitorado();

  const [codigo, setCodigo] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleVincular() {
    if (!monitoradoAtivo) return;
    if (!codigo) {
      setErro("Informe o código do dispositivo.");
      return;
    }
    setErro(null);
    setCarregando(true);
    try {
      await vincularDispositivo(codigo.trim(), monitoradoAtivo.id_monitorado);
      await recarregar();
      router.back();
    } catch (error) {
      setErro(extrairErro(error, "Não foi possível vincular o dispositivo."));
    } finally {
      setCarregando(false);
    }
  }

  if (!monitoradoAtivo) {
    return (
      <Screen>
        <ModalHeader title="Vincular dispositivo" />
        <EmptyState title="Cadastre um monitorado primeiro" subtitle="É necessário ter um monitorado para vincular um dispositivo." />
      </Screen>
    );
  }

  return (
    <Screen>
      <ModalHeader title="Vincular dispositivo" />
      <Subtitle>Vincule o wearable (ESP32) de {monitoradoAtivo.nome}.</Subtitle>

      <ErrorBanner message={erro ?? ""} />

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
        <Text style={styles.infoText}>
          O código deve ser exatamente o mesmo gravado no firmware do ESP32 (variável de código do
          dispositivo). É ele que autentica as leituras enviadas pelo hardware.
        </Text>
      </View>

      <TextField
        label="Código do dispositivo"
        placeholder="Ex: ESP32-A1B2C3"
        autoCapitalize="characters"
        value={codigo}
        onChangeText={setCodigo}
      />

      <Button title="Vincular dispositivo" onPress={handleVincular} loading={carregando} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  infoBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: `${colors.accent}1A`,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 14,
    padding: 12,
  },
  infoText: { color: colors.text, fontSize: 12, flex: 1, lineHeight: 17 },
});
