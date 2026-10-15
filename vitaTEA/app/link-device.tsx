import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Screen, Card, Subtitle, ErrorBanner, EmptyState } from "@/components/vitatea/ui";
import { ModalHeader } from "@/components/vitatea/modal-header";
import { TextField } from "@/components/vitatea/text-field";
import { Button } from "@/components/vitatea/button";
import { colors } from "@/constants/vitatea-theme";
import { useMonitorado } from "@/context/MonitoradoContext";
import { useWearable } from "@/context/WearableContext";
import { vincularDispositivo } from "@/lib/api/dispositivos";
import { extrairErro } from "@/lib/api/client";

export default function LinkDeviceScreen() {
  const router = useRouter();
  const { monitoradoAtivo, dispositivo, recarregar } = useMonitorado();
  const wearable = useWearable();

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

  // Sem Web Bluetooth (app nativo ou navegador sem suporte): vínculo manual pelo código.
  if (!wearable.suportado) {
    return (
      <Screen>
        <ModalHeader title="Vincular dispositivo" />
        <Subtitle>Vincule o wearable (ESP32) de {monitoradoAtivo.nome}.</Subtitle>

        <ErrorBanner message={erro ?? ""} />

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
          <Text style={styles.infoText}>
            Este navegador não tem Bluetooth. Abra o app no Chrome ou Edge para procurar o wearable, ou
            informe o nome dele (ex: VitaTEA-A1B2C3) para apenas vincular.
          </Text>
        </View>

        <TextField
          label="Código do dispositivo"
          placeholder="Ex: VitaTEA-A1B2C3"
          value={codigo}
          onChangeText={setCodigo}
        />

        <Button title="Vincular dispositivo" onPress={handleVincular} loading={carregando} />
      </Screen>
    );
  }

  const conectado = wearable.status === "conectado";

  return (
    <Screen>
      <ModalHeader title="Vincular dispositivo" />
      <Subtitle>Conecte o wearable (ESP32) de {monitoradoAtivo.nome} por Bluetooth.</Subtitle>

      <ErrorBanner message={wearable.erro ?? ""} />

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
        <Text style={styles.infoText}>
          {dispositivo
            ? `Este monitorado está vinculado ao dispositivo ${dispositivo.codigo}. Selecione-o na lista do navegador para conectar.`
            : "O navegador vai listar os wearables VitaTEA ligados por perto. O que você escolher será vinculado a este monitorado."}
        </Text>
      </View>

      {conectado && (
        <Card style={styles.bpmCard}>
          <Ionicons name="heart" size={22} color={colors.danger} />
          <View>
            <Text style={styles.bpmValue}>
              {wearable.bpm ?? "--"}
              <Text style={styles.bpmUnit}> bpm</Text>
            </Text>
            <Text style={styles.bpmLabel}>
              {wearable.bpm === null ? "Conectado, aguardando medição..." : "Recebendo em tempo real"}
            </Text>
          </View>
        </Card>
      )}

      {conectado && (
        <Card style={styles.bpmCard}>
          <Ionicons name="water" size={22} color={colors.primary} />
          <View>
            <Text style={styles.bpmValue}>
              {wearable.spo2 ?? "--"}
              <Text style={styles.bpmUnit}> %</Text>
            </Text>
            <Text style={styles.bpmLabel}>
              {wearable.spo2 === null
                ? "Saturação de oxigênio: mantenha o dedo parado (leva alguns segundos)..."
                : "Saturação de oxigênio em tempo real"}
            </Text>
          </View>
        </Card>
      )}

      {wearable.status === "reconectando" && (
        <View style={styles.infoBox}>
          <Ionicons name="sync-outline" size={18} color={colors.accent} />
          <Text style={styles.infoText}>Conexão perdida. Tentando reconectar ao dispositivo automaticamente...</Text>
        </View>
      )}

      {conectado || wearable.status === "reconectando" ? (
        <Button title="Desconectar" variant="secondary" onPress={wearable.desconectar} />
      ) : (
        <Button
          title="Procurar dispositivos Bluetooth"
          onPress={wearable.conectar}
          loading={wearable.status === "conectando"}
        />
      )}
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
  bpmCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  bpmValue: { color: colors.text, fontSize: 26, fontWeight: "700" },
  bpmUnit: { fontSize: 13, color: colors.textMuted, fontWeight: "400" },
  bpmLabel: { color: colors.textMuted, fontSize: 12 },
});
