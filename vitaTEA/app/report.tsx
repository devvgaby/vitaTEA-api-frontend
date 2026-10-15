import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Screen, Card, Subtitle, ErrorBanner, EmptyState, Badge } from "@/components/vitatea/ui";
import { ModalHeader } from "@/components/vitatea/modal-header";
import { Button } from "@/components/vitatea/button";
import { LineChart, DistribuicaoAlertas } from "@/components/vitatea/charts";
import { colors, radius } from "@/constants/vitatea-theme";
import { useMonitorado } from "@/context/MonitoradoContext";
import { buscarRelatorio } from "@/lib/api/relatorios";
import { extrairErro } from "@/lib/api/client";
import { exportarCsv, imprimirRelatorio, ROTULO_PERIODO } from "@/lib/exportar";
import { avisar } from "@/lib/confirmar";
import type { PeriodoRelatorio, Relatorio } from "@/lib/api/types";

const PERIODOS: PeriodoRelatorio[] = ["1h", "6h", "24h", "7d", "30d"];
const ROTULO_CURTO: Record<PeriodoRelatorio, string> = { "1h": "1 h", "6h": "6 h", "24h": "24 h", "7d": "7 dias", "30d": "30 dias" };

const COR_SINAL: Record<string, string> = {
  "Frequência Cardíaca": colors.danger,
  "Saturação de Oxigênio": colors.accent,
  "Temperatura Corporal": colors.warning,
  "Frequência Respiratória": colors.success,
};

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const numero = (valor: number | null) => (valor === null ? "--" : String(valor).replace(".", ","));

// RN10/RF14: gráficos e resumo por período; RF19: consulta e exportação do histórico.
export default function ReportScreen() {
  const { monitoradoAtivo } = useMonitorado();

  const [periodo, setPeriodo] = useState<PeriodoRelatorio>("24h");
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!monitoradoAtivo) return;
    setCarregando(true);
    setErro(null);
    try {
      setRelatorio(await buscarRelatorio(monitoradoAtivo.id_monitorado, periodo));
    } catch (error) {
      setErro(extrairErro(error, "Não foi possível gerar o relatório."));
    } finally {
      setCarregando(false);
    }
  }, [monitoradoAtivo, periodo]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!monitoradoAtivo) {
    return (
      <Screen>
        <ModalHeader title="Relatório" />
        <EmptyState title="Nenhum monitorado cadastrado" subtitle="Cadastre um monitorado para ver relatórios." />
      </Screen>
    );
  }

  async function handleCsv() {
    if (!monitoradoAtivo) return;
    setExportando(true);
    try {
      await exportarCsv(monitoradoAtivo.id_monitorado, periodo, monitoradoAtivo.nome);
    } catch (error) {
      avisar("Exportação", extrairErro(error, "Não foi possível exportar as leituras."));
    } finally {
      setExportando(false);
    }
  }

  async function handleImprimir() {
    if (!relatorio) return;
    try {
      await imprimirRelatorio(relatorio, periodo);
    } catch (error) {
      avisar("Relatório", error instanceof Error ? error.message : "Não foi possível abrir o relatório.");
    }
  }

  const sinaisComDados = relatorio?.sinais.filter((s) => s.total > 0) ?? [];
  const sinaisSemDados = relatorio?.sinais.filter((s) => s.total === 0) ?? [];

  return (
    <Screen onRefresh={carregar} refreshing={carregando}>
      <ModalHeader title={`Relatório de ${monitoradoAtivo.nome}`} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
        {PERIODOS.map((p) => (
          <Pressable
            key={p}
            onPress={() => setPeriodo(p)}
            style={[styles.chip, periodo === p && { backgroundColor: colors.primary, borderColor: colors.primary }]}
          >
            <Text style={[styles.chipTexto, periodo === p && { color: colors.white }]}>{ROTULO_CURTO[p]}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ErrorBanner message={erro ?? ""} />

      {relatorio ? (
        <>
          <Subtitle>
            {ROTULO_PERIODO[periodo]}: {dataHora(relatorio.periodo.desde)} a {dataHora(relatorio.periodo.ate)}
          </Subtitle>

          <Card>
            <View style={styles.linhaResumo}>
              <Resumo valor={String(relatorio.total_leituras)} rotulo="leituras" />
              <Resumo valor={String(relatorio.alertas.total)} rotulo="alertas" />
              <Resumo valor={String(sinaisComDados.length)} rotulo="sinais medidos" />
            </View>
          </Card>

          {sinaisComDados.length === 0 ? (
            <EmptyState
              icon={<Ionicons name="analytics-outline" size={40} color={colors.textMuted} />}
              title="Sem leituras no período"
              subtitle="Escolha um período maior ou conecte o dispositivo para registrar sinais vitais."
            />
          ) : (
            sinaisComDados.map((sinal) => {
              const cor = COR_SINAL[sinal.nome] ?? colors.primary;
              return (
                <Card key={sinal.id_tipo_sinal} style={{ gap: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={[styles.marca, { backgroundColor: cor }]} />
                    <Text style={styles.sinalTitulo}>{sinal.nome}</Text>
                  </View>

                  <LineChart
                    pontos={sinal.serie.map((p) => ({ t: Date.parse(p.t), valor: p.media, min: p.min, max: p.max }))}
                    limites={sinal.limites}
                    unidade={sinal.unidade_medida}
                    cor={cor}
                  />

                  <View style={styles.linhaResumo}>
                    <Resumo valor={numero(sinal.media)} rotulo={`média (${sinal.unidade_medida})`} />
                    <Resumo valor={numero(sinal.minimo)} rotulo="mínimo" />
                    <Resumo valor={numero(sinal.maximo)} rotulo="máximo" />
                  </View>

                  <Text style={styles.nota}>
                    {sinal.total} leituras
                    {sinal.limites
                      ? ` - limites ${numero(sinal.limites.min)} a ${numero(sinal.limites.max)}${sinal.limites.personalizado ? " (personalizados)" : ""}`
                      : ""}
                    {" - "}
                    {numero(sinal.percentual_fora)}% fora dos limites
                  </Text>
                </Card>
              );
            })
          )}

          {sinaisSemDados.length > 0 && sinaisComDados.length > 0 ? (
            <Text style={styles.nota}>Sem leituras neste período: {sinaisSemDados.map((s) => s.nome).join(", ")}.</Text>
          ) : null}

          <Card style={{ gap: 12 }}>
            <Text style={styles.sinalTitulo}>Alertas no período</Text>
            <DistribuicaoAlertas porNivel={relatorio.alertas.por_nivel} />
            {relatorio.alertas.recentes.length > 0 ? (
              <View style={{ gap: 10, marginTop: 4 }}>
                {relatorio.alertas.recentes.map((a) => (
                  <View key={a.id_alerta} style={{ gap: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Badge nivel={a.nivel_criticidade} />
                      <Text style={styles.nota}>{dataHora(a.data_hora)}</Text>
                    </View>
                    <Text style={styles.alertaTexto}>{a.mensagem}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Card>

          <View style={{ gap: 10 }}>
            <Button title="Exportar leituras (CSV)" variant="secondary" onPress={handleCsv} loading={exportando} />
            <Button
              title={Platform.OS === "web" ? "Imprimir / salvar em PDF" : "Compartilhar resumo"}
              onPress={handleImprimir}
            />
          </View>

          <Text style={styles.aviso}>
            Valores estimados por um protótipo de apoio ao cuidador. Não substituem equipamentos médicos certificados
            nem a avaliação de um profissional de saúde.
          </Text>
        </>
      ) : null}
    </Screen>
  );
}

function Resumo({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={styles.resumoValor}>{valor}</Text>
      <Text style={styles.resumoRotulo}>{rotulo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipTexto: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  linhaResumo: { flexDirection: "row", gap: 8 },
  resumoValor: { color: colors.text, fontSize: 20, fontWeight: "700" },
  resumoRotulo: { color: colors.textMuted, fontSize: 11, marginTop: 2, textAlign: "center" },
  marca: { width: 10, height: 10, borderRadius: 5 },
  sinalTitulo: { color: colors.text, fontSize: 15, fontWeight: "700" },
  nota: { color: colors.textMuted, fontSize: 12 },
  alertaTexto: { color: colors.text, fontSize: 13 },
  aviso: { color: colors.textMuted, fontSize: 11, textAlign: "center", lineHeight: 16, marginBottom: 8 },
});
