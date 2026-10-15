import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Screen, Card, Title, Subtitle, EmptyState, ErrorBanner } from "@/components/vitatea/ui";
import { Button } from "@/components/vitatea/button";
import { colors, radius } from "@/constants/vitatea-theme";
import { useAuth } from "@/context/AuthContext";
import { useMonitorado } from "@/context/MonitoradoContext";
import { useWearable } from "@/context/WearableContext";
import { useNotificacao } from "@/context/NotificacaoContext";
import { listarLeiturasPorDispositivo } from "@/lib/api/leituras";
import { listarTiposSinais } from "@/lib/api/limites";
import { listarAlertasPorMonitorado } from "@/lib/api/alertas";
import type { LeituraDispositivo, TipoSinal } from "@/lib/api/types";
import { extrairErro } from "@/lib/api/client";

const ICONE_POR_SINAL: Record<string, keyof typeof Ionicons.glyphMap> = {
  "Frequência Cardíaca": "heart-outline",
  "Saturação de Oxigênio": "water-outline",
  "Temperatura Corporal": "thermometer-outline",
  "Frequência Respiratória": "cloud-outline",
};

export default function DashboardScreen() {
  const router = useRouter();
  const { cuidador } = useAuth();
  const { monitoradoAtivo, dispositivo, statusDevice, carregando: carregandoMonitorado, erro: erroMonitorado, recarregar } =
    useMonitorado();
  const wearable = useWearable();
  const { permissao, ativarNotificacoes } = useNotificacao();
  const bluetoothConectado = wearable.status === "conectado";
  // No navegador com Bluetooth, vale a conexão real com o wearable; a API só sabe
  // da última leitura e ainda considera "conectado" por alguns minutos após o desligamento.
  const conectado = wearable.suportado ? bluetoothConectado : !!statusDevice?.conectado;

  const [tiposSinais, setTiposSinais] = useState<TipoSinal[]>([]);
  const [ultimasLeituras, setUltimasLeituras] = useState<LeituraDispositivo[]>([]);
  const [totalAlertasAbertos, setTotalAlertasAbertos] = useState(0);
  const [carregandoDados, setCarregandoDados] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    if (!dispositivo || !monitoradoAtivo) return;
    setCarregandoDados(true);
    setErro(null);
    try {
      const [tipos, leituras, alertas] = await Promise.all([
        listarTiposSinais(),
        listarLeiturasPorDispositivo(dispositivo.id_dispositivo, { limite: 300 }),
        listarAlertasPorMonitorado(monitoradoAtivo.id_monitorado),
      ]);

      setTiposSinais(tipos);

      // Pega a leitura mais recente de cada tipo de sinal.
      const maisRecentePorTipo = new Map<number, LeituraDispositivo>();
      for (const leitura of leituras) {
        const atual = maisRecentePorTipo.get(leitura.id_tipo_sinal);
        if (!atual || new Date(leitura.data_hora) > new Date(atual.data_hora)) {
          maisRecentePorTipo.set(leitura.id_tipo_sinal, leitura);
        }
      }
      setUltimasLeituras(Array.from(maisRecentePorTipo.values()));
      setTotalAlertasAbertos(alertas.filter((a) => !a.visualizado).length);
    } catch (error) {
      setErro(extrairErro(error, "Não foi possível carregar os dados do painel."));
    } finally {
      setCarregandoDados(false);
    }
  }, [dispositivo, monitoradoAtivo]);

  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [carregarDados]),
  );

  async function handleRefresh() {
    await recarregar();
    await carregarDados();
  }

  if (!carregandoMonitorado && !monitoradoAtivo) {
    return (
      <Screen>
        <View style={{ marginTop: 24 }}>
          <Title>Olá, {cuidador?.nome?.split(" ")[0]} 👋</Title>
        </View>
        <EmptyState
          icon={<Ionicons name="person-add-outline" size={40} color={colors.textMuted} />}
          title="Nenhum monitorado cadastrado"
          subtitle="Cadastre a criança ou adolescente que será monitorado para começar."
        />
        <Button title="Cadastrar monitorado" onPress={() => router.push("/add-monitored")} />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={handleRefresh} refreshing={carregandoMonitorado || carregandoDados}>
      <View style={{ marginTop: 12, gap: 4 }}>
        <Subtitle>Olá, {cuidador?.nome?.split(" ")[0]}</Subtitle>
        <Title>{monitoradoAtivo?.nome}</Title>
      </View>

      <ErrorBanner message={erro ?? erroMonitorado ?? ""} />

      {/* Status do dispositivo (RF20) */}
      <Card style={styles.statusCard}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: conectado ? colors.success : colors.danger },
            ]}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>
              {dispositivo
                ? conectado
                  ? "Dispositivo conectado"
                  : "Dispositivo desconectado"
                : "Nenhum dispositivo vinculado"}
            </Text>
            <Text style={styles.statusSubtitle}>
              {dispositivo ? `Código ${dispositivo.codigo}` : "Vincule um dispositivo IoT para começar a monitorar"}
            </Text>
          </View>
          {!bluetoothConectado && (
            <Pressable onPress={() => router.push("/link-device")}>
              <Ionicons name={dispositivo ? "bluetooth" : "add-circle"} size={28} color={colors.primary} />
            </Pressable>
          )}
        </View>
      </Card>

      {/* Convite para ativar as notificações do navegador */}
      {permissao === "default" && (
        <Pressable onPress={ativarNotificacoes}>
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name="notifications-outline" size={22} color={colors.primary} />
            <Text style={styles.alertBannerText}>Ativar notificações de emergência neste navegador</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ marginLeft: "auto" }} />
          </Card>
        </Pressable>
      )}

      {/* Alertas em aberto */}
      {totalAlertasAbertos > 0 && (
        <Pressable onPress={() => router.push("/alerts")}>
          <Card style={{ borderColor: colors.danger, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name="warning" size={22} color={colors.danger} />
            <Text style={styles.alertBannerText}>
              {totalAlertasAbertos} {totalAlertasAbertos === 1 ? "alerta não visualizado" : "alertas não visualizados"}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.danger} style={{ marginLeft: "auto" }} />
          </Card>
        </Pressable>
      )}

      {/* Sinais vitais */}
      <View style={{ gap: 10 }}>
        <Text style={styles.sectionTitle}>Sinais vitais</Text>
        {dispositivo && (ultimasLeituras.length > 0 || bluetoothConectado) ? (
          <View style={styles.vitalsGrid}>
            {tiposSinais.map((tipo) => {
              const leitura = ultimasLeituras.find((l) => l.id_tipo_sinal === tipo.id_tipo_sinal);
              // Com o wearable conectado, FC e SpO2 vêm direto do Bluetooth.
              const aoVivo =
                tipo.nome === "Frequência Cardíaca"
                  ? wearable.bpm
                  : tipo.nome === "Saturação de Oxigênio"
                    ? wearable.spo2
                    : null;
              return (
                <Card key={tipo.id_tipo_sinal} style={styles.vitalCard}>
                  <Ionicons
                    name={ICONE_POR_SINAL[tipo.nome] ?? "pulse-outline"}
                    size={22}
                    color={colors.primary}
                  />
                  <Text style={styles.vitalValue}>
                    {aoVivo ?? (leitura ? `${leitura.valor}` : "--")}
                    <Text style={styles.vitalUnit}> {tipo.unidade_medida}</Text>
                  </Text>
                  <Text style={styles.vitalLabel}>{tipo.nome}</Text>
                </Card>
              );
            })}
          </View>
        ) : (
          <Card>
            <Text style={styles.statusSubtitle}>
              {dispositivo
                ? "Aguardando a primeira leitura do dispositivo..."
                : "Vincule um dispositivo para visualizar os sinais vitais em tempo real."}
            </Text>
          </Card>
        )}
      </View>

      {/* Ações rápidas */}
      <View style={{ gap: 10 }}>
        <Text style={styles.sectionTitle}>Ações rápidas</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <QuickAction icon="options-outline" label="Limites" onPress={() => router.push("/limits")} />
          <QuickAction icon="hardware-chip-outline" label="Dispositivo" onPress={() => router.push("/link-device")} />
          <QuickAction icon="person-add-outline" label="Monitorado" onPress={() => router.push("/add-monitored")} />
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <QuickAction icon="analytics-outline" label="Relatórios" onPress={() => router.push("/report")} />
          <QuickAction icon="create-outline" label="Editar" onPress={() => router.push("/edit-monitored")} />
          <QuickAction icon="notifications-outline" label="Alertas" onPress={() => router.push("/alerts")} />
        </View>
      </View>
    </Screen>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  statusCard: { paddingVertical: 14 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusTitle: { color: colors.text, fontWeight: "600", fontSize: 14 },
  statusSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  alertBannerText: { color: colors.text, fontSize: 13, fontWeight: "600", flexShrink: 1 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  vitalsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  vitalCard: { width: "47%", alignItems: "flex-start", gap: 4 },
  vitalValue: { color: colors.text, fontSize: 22, fontWeight: "700" },
  vitalUnit: { fontSize: 13, color: colors.textMuted, fontWeight: "400" },
  vitalLabel: { color: colors.textMuted, fontSize: 12 },
  quickAction: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingVertical: 16,
    alignItems: "center",
    gap: 6,
  },
  quickActionLabel: { color: colors.text, fontSize: 12, fontWeight: "600" },
});
