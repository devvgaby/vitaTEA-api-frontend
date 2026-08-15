
  import React, { useCallback, useState } from "react";
  import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
  import { useFocusEffect } from "expo-router";
  import { Ionicons } from "@expo/vector-icons";

  import { Screen, Card, Title, Badge, EmptyState, ErrorBanner } from "@/components/vitatea/ui";
  import { colors } from "@/constants/vitatea-theme";
  import { useMonitorado } from "@/context/MonitoradoContext";
  import { listarAlertasPorMonitorado, marcarAlertaVisualizado } from "@/lib/api/alertas";
  import type { Alerta } from "@/lib/api/types";
  import { extrairErro } from "@/lib/api/client";

  function formatarDataHora(iso: string) {
    const data = new Date(iso);
    return data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  export default function AlertsScreen() {
    const { monitoradoAtivo } = useMonitorado();
    const [alertas, setAlertas] = useState<Alerta[]>([]);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    const carregar = useCallback(async () => {
      if (!monitoradoAtivo) return;
      setCarregando(true);
      setErro(null);
      try {
        const dados = await listarAlertasPorMonitorado(monitoradoAtivo.id_monitorado);
        setAlertas(dados);
      } catch (error) {
        setErro(extrairErro(error, "Não foi possível carregar os alertas."));
      } finally {
        setCarregando(false);
      }
    }, [monitoradoAtivo]);

    useFocusEffect(
      useCallback(() => {
        carregar();
      }, [carregar]),
    );

    async function handleVisualizar(alerta: Alerta) {
      if (alerta.visualizado) return;
      // Atualização otimista: marca na tela antes da resposta do servidor.
      setAlertas((prev) =>
        prev.map((a) => (a.id_alerta === alerta.id_alerta ? { ...a, visualizado: true } : a)),
      );
      try {
        await marcarAlertaVisualizado(alerta.id_alerta);
      } catch {
        // Se falhar, reverte.
        setAlertas((prev) =>
          prev.map((a) => (a.id_alerta === alerta.id_alerta ? { ...a, visualizado: false } : a)),
        );
      }
    }

    if (!monitoradoAtivo) {
      return (
        <Screen>
          <EmptyState title="Nenhum monitorado selecionado" subtitle="Cadastre um monitorado para ver os alertas." />
        </Screen>
      );
    }

    return (
      <Screen scroll={false}>
        <View style={{ marginTop: 12, marginBottom: 4 }}>
          <Title>Alertas</Title>
        </View>
        <ErrorBanner message={erro ?? ""} />
        <FlatList
          data={alertas}
          keyExtractor={(item) => String(item.id_alerta)}
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          onRefresh={carregar}
          refreshing={carregando}
          ListEmptyComponent={
            <EmptyState
              icon={<Ionicons name="checkmark-circle-outline" size={40} color={colors.success} />}
              title="Nenhum alerta registrado"
              subtitle="Os sinais vitais do monitorado estão dentro da normalidade."
            />
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => handleVisualizar(item)}>
              <Card style={!item.visualizado && { borderColor: colors.primary }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Badge nivel={item.nivel_criticidade} />
                  {!item.visualizado && <View style={styles.naoLidoDot} />}
                </View>
                <Text style={styles.mensagem}>{item.mensagem}</Text>
                <Text style={styles.data}>{formatarDataHora(item.data_hora)}</Text>
              </Card>
            </Pressable>
          )}
        />
      </Screen>
    );
  }

  const styles = StyleSheet.create({
    mensagem: { color: colors.text, fontSize: 14, lineHeight: 20 },
    data: { color: colors.textMuted, fontSize: 12 },
    naoLidoDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  });
