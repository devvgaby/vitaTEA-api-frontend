import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ScrollView } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Screen, Card, Title, EmptyState, ErrorBanner } from "@/components/vitatea/ui";
import { LineChart } from "@/components/vitatea/charts";
import { colors, radius } from "@/constants/vitatea-theme";
import { LIMITES_PADRAO_INFO } from "@/lib/limites-padrao";
import { useMonitorado } from "@/context/MonitoradoContext";
import { listarLeiturasPorDispositivo } from "@/lib/api/leituras";
import { listarTiposSinais, listarLimitesSinais } from "@/lib/api/limites";
import type { LeituraDispositivo, LimiteSinal, TipoSinal } from "@/lib/api/types";
import { extrairErro } from "@/lib/api/client";

const PONTOS_NO_GRAFICO = 60;

const COR_SINAL: Record<string, string> = {
  "Frequência Cardíaca": colors.danger,
  "Saturação de Oxigênio": colors.accent,
  "Temperatura Corporal": colors.warning,
  "Frequência Respiratória": colors.success,
};

function formatarDataHora(iso: string) {
  const data = new Date(iso);
  return data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function HistoryScreen() {
  const { dispositivo, monitoradoAtivo } = useMonitorado();
  const [tiposSinais, setTiposSinais] = useState<TipoSinal[]>([]);
  const [limites, setLimites] = useState<LimiteSinal[]>([]);
  const [leituras, setLeituras] = useState<LeituraDispositivo[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!dispositivo) return;
    setCarregando(true);
    setErro(null);
    try {
      const [tipos, dados, limitesDoCuidador] = await Promise.all([
        listarTiposSinais(),
        listarLeiturasPorDispositivo(dispositivo.id_dispositivo, { limite: 500 }),
        listarLimitesSinais(),
      ]);
      setTiposSinais(tipos);
      setLeituras(dados);
      setLimites(limitesDoCuidador);
    } catch (error) {
      setErro(extrairErro(error, "Não foi possível carregar o histórico."));
    } finally {
      setCarregando(false);
    }
  }, [dispositivo]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  if (!dispositivo) {
    return (
      <Screen>
        <EmptyState
          icon={<Ionicons name="hardware-chip-outline" size={40} color={colors.textMuted} />}
          title="Nenhum dispositivo vinculado"
          subtitle="Vincule um dispositivo IoT para começar a registrar o histórico de sinais vitais."
        />
      </Screen>
    );
  }

  const leiturasFiltradas = filtroTipo ? leituras.filter((l) => l.id_tipo_sinal === filtroTipo) : leituras;
  const tipoPorId = new Map(tiposSinais.map((t) => [t.id_tipo_sinal, t]));

  // Gráfico por sinal com as leituras mais recentes e a faixa de normalidade.
  const graficos = tiposSinais
    .filter((t) => filtroTipo === null || t.id_tipo_sinal === filtroTipo)
    .map((tipo) => {
      const recentes = leituras
        .filter((l) => l.id_tipo_sinal === tipo.id_tipo_sinal)
        .slice(0, PONTOS_NO_GRAFICO)
        .reverse();
      const personalizado = limites.find(
        (l) => l.id_monitorado === monitoradoAtivo?.id_monitorado && l.id_tipo_sinal === tipo.id_tipo_sinal,
      );
      const padrao = LIMITES_PADRAO_INFO[tipo.nome];
      const faixa = personalizado
        ? { min: Number(personalizado.valor_min), max: Number(personalizado.valor_max) }
        : (padrao ?? null);
      return { tipo, recentes, faixa };
    })
    .filter((g) => g.recentes.length >= 2);

  return (
    <Screen scroll={false}>
      <View style={{ marginTop: 12, marginBottom: 4 }}>
        <Title>Histórico</Title>
      </View>
      <ErrorBanner message={erro ?? ""} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
        <FiltroChip label="Todos" ativo={filtroTipo === null} onPress={() => setFiltroTipo(null)} />
        {tiposSinais.map((t) => (
          <FiltroChip
            key={t.id_tipo_sinal}
            label={t.nome}
            ativo={filtroTipo === t.id_tipo_sinal}
            onPress={() => setFiltroTipo(t.id_tipo_sinal)}
          />
        ))}
      </ScrollView>

      <FlatList
        data={leiturasFiltradas}
        keyExtractor={(item) => String(item.id_leitura_dispositivo)}
        contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
        onRefresh={carregar}
        refreshing={carregando}
        ListHeaderComponent={
          graficos.length > 0 ? (
            <View style={{ gap: 10 }}>
              {graficos.map(({ tipo, recentes, faixa }) => (
                <Card key={tipo.id_tipo_sinal} style={{ gap: 8 }}>
                  <Text style={styles.tipo}>
                    {tipo.nome} <Text style={styles.data}>- últimas {recentes.length} leituras</Text>
                  </Text>
                  <LineChart
                    pontos={recentes.map((l) => ({ t: Date.parse(l.data_hora), valor: Number(l.valor) }))}
                    limites={faixa}
                    unidade={tipo.unidade_medida}
                    altura={120}
                    cor={COR_SINAL[tipo.nome] ?? colors.primary}
                  />
                </Card>
              ))}
              <Text style={[styles.data, { marginBottom: 4 }]}>Leituras (mais recentes primeiro)</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState title="Nenhuma leitura registrada" subtitle="As leituras do dispositivo aparecerão aqui." />
        }
        renderItem={({ item }) => {
          const tipo = tipoPorId.get(item.id_tipo_sinal);
          return (
            <Card style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={styles.tipo}>{tipo?.nome ?? "Sinal"}</Text>
                <Text style={styles.data}>{formatarDataHora(item.data_hora)}</Text>
              </View>
              <Text style={styles.valor}>
                {item.valor} <Text style={styles.unidade}>{tipo?.unidade_medida}</Text>
              </Text>
            </Card>
          );
        }}
      />
    </Screen>
  );
}

function FiltroChip({ label, ativo, onPress }: { label: string; ativo: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, ativo && { backgroundColor: colors.primary, borderColor: colors.primary }]}
    >
      <Text style={[styles.chipText, ativo && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tipo: { color: colors.text, fontSize: 14, fontWeight: "600" },
  data: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  valor: { color: colors.text, fontSize: 18, fontWeight: "700" },
  unidade: { fontSize: 12, color: colors.textMuted, fontWeight: "400" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
});
