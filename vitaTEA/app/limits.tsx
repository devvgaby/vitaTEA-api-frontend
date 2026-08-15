import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";

import { Screen, Card, Subtitle, ErrorBanner, EmptyState } from "@/components/vitatea/ui";
import { ModalHeader } from "@/components/vitatea/modal-header";
import { TextField } from "@/components/vitatea/text-field";
import { Button } from "@/components/vitatea/button";
import { colors } from "@/constants/vitatea-theme";
import { useMonitorado } from "@/context/MonitoradoContext";
import { listarTiposSinais, listarLimitesSinais, criarLimiteSinal, atualizarLimiteSinal } from "@/lib/api/limites";
import type { TipoSinal, LimiteSinal } from "@/lib/api/types";
import { extrairErro } from "@/lib/api/client";
import { LIMITES_PADRAO_INFO } from "@/lib/limites-padrao";

export default function LimitsScreen() {
  const { monitoradoAtivo } = useMonitorado();

  const [tiposSinais, setTiposSinais] = useState<TipoSinal[]>([]);
  const [limites, setLimites] = useState<LimiteSinal[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!monitoradoAtivo) return;
    setCarregando(true);
    setErro(null);
    try {
      const [tipos, todosLimites] = await Promise.all([listarTiposSinais(), listarLimitesSinais()]);
      setTiposSinais(tipos);
      setLimites(todosLimites.filter((l) => l.id_monitorado === monitoradoAtivo.id_monitorado));
    } catch (error) {
      setErro(extrairErro(error, "Não foi possível carregar os limites."));
    } finally {
      setCarregando(false);
    }
  }, [monitoradoAtivo]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!monitoradoAtivo) {
    return (
      <Screen>
        <ModalHeader title="Limites de sinais vitais" />
        <EmptyState title="Cadastre um monitorado primeiro" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ModalHeader title="Limites de sinais vitais" />
      <Subtitle>
        Personalize os limites de {monitoradoAtivo.nome} (RF15). Se não personalizar, o sistema usa limites
        clínicos padrão (RN12).
      </Subtitle>

      <ErrorBanner message={erro ?? ""} />
      {carregando && <Text style={{ color: colors.textMuted, fontSize: 13 }}>Carregando limites...</Text>}

      <View style={{ gap: 12 }}>
        {tiposSinais.map((tipo) => {
          const limiteExistente = limites.find((l) => l.id_tipo_sinal === tipo.id_tipo_sinal);
          return (
            <LimiteRow
              key={tipo.id_tipo_sinal}
              tipo={tipo}
              limiteExistente={limiteExistente}
              idMonitorado={monitoradoAtivo.id_monitorado}
              onSalvo={carregar}
            />
          );
        })}
      </View>
    </Screen>
  );
}

function LimiteRow({
  tipo,
  limiteExistente,
  idMonitorado,
  onSalvo,
}: {
  tipo: TipoSinal;
  limiteExistente?: LimiteSinal;
  idMonitorado: number;
  onSalvo: () => void;
}) {
  const padrao = LIMITES_PADRAO_INFO[tipo.nome];

  const [valorMin, setValorMin] = useState(limiteExistente ? String(limiteExistente.valor_min) : "");
  const [valorMax, setValorMax] = useState(limiteExistente ? String(limiteExistente.valor_max) : "");
  const [salvando, setSalvando] = useState(false);
  const [erroLocal, setErroLocal] = useState<string | null>(null);

  async function handleSalvar() {
    if (!valorMin || !valorMax) {
      setErroLocal("Preencha os dois valores.");
      return;
    }
    setErroLocal(null);
    setSalvando(true);
    try {
      if (limiteExistente) {
        await atualizarLimiteSinal(limiteExistente.id_limite_sinal, {
          valor_min: Number(valorMin),
          valor_max: Number(valorMax),
        });
      } else {
        await criarLimiteSinal(idMonitorado, tipo.id_tipo_sinal, Number(valorMin), Number(valorMax));
      }
      onSalvo();
    } catch (error) {
      setErroLocal(extrairErro(error, "Não foi possível salvar."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card>
      <Text style={styles.tipoNome}>{tipo.nome}</Text>
      {padrao && <Text style={styles.padraoText}>Padrão clínico: {padrao.min}–{padrao.max}{tipo.unidade_medida}</Text>}

      {erroLocal && <Text style={styles.erroLocal}>{erroLocal}</Text>}

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <TextField label={`Mínimo (${tipo.unidade_medida})`} keyboardType="decimal-pad" value={valorMin} onChangeText={setValorMin} />
        </View>
        <View style={{ flex: 1 }}>
          <TextField label={`Máximo (${tipo.unidade_medida})`} keyboardType="decimal-pad" value={valorMax} onChangeText={setValorMax} />
        </View>
      </View>

      <Button title={limiteExistente ? "Atualizar" : "Salvar"} onPress={handleSalvar} loading={salvando} variant="secondary" />
    </Card>
  );
}

const styles = StyleSheet.create({
  tipoNome: { color: colors.text, fontSize: 15, fontWeight: "700" },
  padraoText: { color: colors.textMuted, fontSize: 12 },
  erroLocal: { color: colors.danger, fontSize: 12 },
});
