import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
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

  // Sem Bluetooth nativo (navegador, iOS ou Expo Go): vínculo manual pelo código.
  if (!wearable.suportado) {
    return (
      <Screen>
        <ModalHeader title="Vincular dispositivo" />
        <Subtitle>Vincule o wearable (ESP32) de {monitoradoAtivo.nome}.</Subtitle>

        <ErrorBanner message={erro ?? ""} />

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
          <Text style={styles.infoText}>
            A conexão Bluetooth com o wearable funciona apenas no app Android instalado (APK). Aqui você
            pode só vincular, informando o nome dele (ex: VitaTEA-A1B2C3).
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

  const conectando = wearable.status === "conectando";
  const reconectando = wearable.status === "reconectando";

  return (
    <Screen>
      <ModalHeader title="Vincular dispositivo" />
      <Subtitle>Conecte o wearable (ESP32) de {monitoradoAtivo.nome} por Bluetooth.</Subtitle>

      <ErrorBanner message={wearable.erro ?? ""} />

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
        <Text style={styles.infoText}>
          {dispositivo
            ? `Este monitorado está vinculado ao dispositivo ${dispositivo.codigo}. Toque nele na lista para conectar.`
            : "Ligue o wearable perto do celular e toque em procurar. O que você escolher será vinculado a este monitorado."}
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

      {!conectado && (wearable.buscando || wearable.encontrados.length > 0) && (
        <View style={{ gap: 8 }}>
          {wearable.encontrados.map((item) => (
            <Pressable
              key={item.id}
              disabled={conectando}
              onPress={() => wearable.conectar(item)}
              style={({ pressed }) => [styles.deviceItem, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="watch-outline" size={20} color={colors.primary} />
              <Text style={styles.deviceName}>{item.nome}</Text>
              {dispositivo?.codigo === item.nome && <Text style={styles.deviceTag}>vinculado</Text>}
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ marginLeft: "auto" }} />
            </Pressable>
          ))}
          {wearable.buscando && (
            <View style={styles.searching}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.bpmLabel}>Procurando wearables VitaTEA...</Text>
            </View>
          )}
        </View>
      )}

      {!conectado && !reconectando && !wearable.buscando && wearable.encontrados.length === 0 && !conectando && (
        <Text style={styles.bpmLabel}>Nenhum wearable na lista. Toque em procurar.</Text>
      )}

      {reconectando && !wearable.buscando && (
        <View style={styles.searching}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.bpmLabel}>Tentando reconectar a {dispositivo?.codigo ?? "o wearable"}...</Text>
        </View>
      )}

      {conectado ? (
        <Button title="Desconectar" variant="secondary" onPress={wearable.desconectar} />
      ) : reconectando && !wearable.buscando ? (
        <>
          <Button title="Procurar dispositivos Bluetooth" onPress={wearable.buscar} />
          <Button title="Parar de tentar reconectar" variant="secondary" onPress={wearable.desconectar} />
        </>
      ) : wearable.buscando ? (
        <Button title="Parar busca" variant="secondary" onPress={wearable.pararBusca} />
      ) : (
        <Button
          title={wearable.encontrados.length ? "Procurar novamente" : "Procurar dispositivos Bluetooth"}
          onPress={wearable.buscar}
          loading={conectando}
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
  deviceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  deviceName: { color: colors.text, fontSize: 14, fontWeight: "600" },
  deviceTag: { color: colors.success, fontSize: 11, fontWeight: "600" },
  searching: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", padding: 8 },
});
