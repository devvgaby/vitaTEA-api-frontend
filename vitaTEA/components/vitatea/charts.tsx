import React, { useState } from "react";
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import { colors, criticidade, NivelCriticidade } from "@/constants/vitatea-theme";

// Gráficos feitos só com componentes do React Native (sem bibliotecas extras),
// por isso funcionam igual no navegador, no Android e no iOS.

export type PontoGrafico = {
  t: number; // timestamp em ms
  valor: number; // linha principal (média)
  min?: number; // faixa de variação (opcional)
  max?: number;
};

type LineChartProps = {
  pontos: PontoGrafico[];
  limites?: { min: number; max: number } | null; // faixa considerada normal
  unidade?: string;
  altura?: number;
  cor?: string;
};

const ESQ = 40;
const DIR = 8;
const TOPO = 8;
const BASE = 6;

const formatarNumero = (valor: number) =>
  Number.isInteger(valor) ? String(valor) : valor.toFixed(1).replace(".", ",");

const formatarHora = (t: number, incluirData: boolean) => {
  const data = new Date(t);
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (!incluirData) return hora;
  return `${data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${hora}`;
};

export function LineChart({ pontos, limites, unidade = "", altura = 150, cor = colors.primary }: LineChartProps) {
  const [largura, setLargura] = useState(0);

  if (pontos.length === 0) {
    return (
      <View style={[styles.vazio, { height: altura }]}>
        <Text style={styles.vazioTexto}>Sem leituras no período</Text>
      </View>
    );
  }

  const areaW = Math.max(largura - ESQ - DIR, 0);
  const areaH = altura - TOPO - BASE;

  const valores = pontos.flatMap((p) => [p.valor, p.min ?? p.valor, p.max ?? p.valor]);
  if (limites) valores.push(limites.min, limites.max);
  const menor = Math.min(...valores);
  const maior = Math.max(...valores);
  const folga = (maior - menor) * 0.12 || 1;
  const yMin = menor - folga;
  const yMax = maior + folga;

  const tMin = pontos[0].t;
  const tMax = pontos[pontos.length - 1].t;

  const x = (t: number) => (tMax === tMin ? areaW / 2 : ((t - tMin) / (tMax - tMin)) * areaW);
  const y = (v: number) => areaH - ((v - yMin) / (yMax - yMin)) * areaH;

  const mostrarPontos = pontos.length <= 40;
  const incluirData = tMax - tMin > 20 * 60 * 60 * 1000;

  const marcasY = [yMax, (yMax + yMin) / 2, yMin];

  return (
    <View style={{ height: altura + 18 }} onLayout={(e: LayoutChangeEvent) => setLargura(e.nativeEvent.layout.width)}>
      {largura > 0 && (
        <>
          {/* faixa normal */}
          {limites && (
            <View
              style={{
                position: "absolute",
                left: ESQ,
                width: areaW,
                top: TOPO + y(limites.max),
                height: Math.max(y(limites.min) - y(limites.max), 1),
                backgroundColor: colors.successMuted,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: colors.success + "66",
              }}
            />
          )}

          {/* linhas de grade e rótulos do eixo Y */}
          {marcasY.map((valor, i) => (
            <View key={i} style={{ position: "absolute", left: 0, right: 0, top: TOPO + y(valor) - 7 }}>
              <Text style={styles.rotuloY}>{formatarNumero(valor)}</Text>
              <View style={[styles.grade, { left: ESQ, top: 7 }]} />
            </View>
          ))}

          {/* variação (mín a máx) em cada ponto */}
          {pontos.map(
            (p, i) =>
              p.min !== undefined &&
              p.max !== undefined &&
              p.max > p.min && (
                <View
                  key={`faixa-${i}`}
                  style={{
                    position: "absolute",
                    left: ESQ + x(p.t) - 1,
                    top: TOPO + y(p.max),
                    width: 2,
                    height: Math.max(y(p.min) - y(p.max), 1),
                    backgroundColor: cor + "40",
                  }}
                />
              ),
          )}

          {/* linha da média */}
          {pontos.slice(1).map((p, i) => {
            const anterior = pontos[i];
            const x1 = x(anterior.t);
            const y1 = y(anterior.valor);
            const x2 = x(p.t);
            const y2 = y(p.valor);
            const comprimento = Math.hypot(x2 - x1, y2 - y1);
            const angulo = Math.atan2(y2 - y1, x2 - x1);
            return (
              <View
                key={`seg-${i}`}
                style={{
                  position: "absolute",
                  left: ESQ + (x1 + x2) / 2 - comprimento / 2,
                  top: TOPO + (y1 + y2) / 2 - 1,
                  width: comprimento,
                  height: 2,
                  borderRadius: 1,
                  backgroundColor: cor,
                  transform: [{ rotate: `${angulo}rad` }],
                }}
              />
            );
          })}

          {/* pontos */}
          {pontos.map((p, i) => {
            const ultimo = i === pontos.length - 1;
            if (!mostrarPontos && !ultimo) return null;
            const fora = limites ? p.valor < limites.min || p.valor > limites.max : false;
            return (
              <View
                key={`ponto-${i}`}
                style={{
                  position: "absolute",
                  left: ESQ + x(p.t) - 3,
                  top: TOPO + y(p.valor) - 3,
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: fora ? colors.danger : cor,
                }}
              />
            );
          })}

          {/* eixo X */}
          <View style={{ position: "absolute", left: ESQ, right: DIR, top: altura + 2, flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={styles.rotuloX}>{formatarHora(tMin, incluirData)}</Text>
            {tMax !== tMin && <Text style={styles.rotuloX}>{formatarHora(tMax, incluirData)}</Text>}
          </View>
        </>
      )}
      {unidade ? <Text style={styles.unidade}>{unidade}</Text> : null}
    </View>
  );
}

// Barra empilhada com a quantidade de alertas por nível de criticidade.
export function DistribuicaoAlertas({ porNivel }: { porNivel: Record<NivelCriticidade, number> }) {
  const niveis: NivelCriticidade[] = ["critico", "alto", "medio", "baixo"];
  const total = niveis.reduce((soma, nivel) => soma + (porNivel[nivel] ?? 0), 0);

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.barra}>
        {total === 0 ? (
          <View style={{ flex: 1, backgroundColor: colors.successMuted }} />
        ) : (
          niveis.map(
            (nivel) =>
              (porNivel[nivel] ?? 0) > 0 && (
                <View key={nivel} style={{ flex: porNivel[nivel], backgroundColor: criticidade[nivel].color }} />
              ),
          )
        )}
      </View>
      <View style={styles.legenda}>
        {niveis.map((nivel) => (
          <View key={nivel} style={styles.legendaItem}>
            <View style={[styles.legendaCor, { backgroundColor: criticidade[nivel].color }]} />
            <Text style={styles.legendaTexto}>
              {criticidade[nivel].label}: {porNivel[nivel] ?? 0}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  vazio: { alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.bg },
  vazioTexto: { color: colors.textMuted, fontSize: 12 },
  rotuloY: { position: "absolute", left: 0, width: ESQ - 6, textAlign: "right", color: colors.textMuted, fontSize: 10 },
  grade: { position: "absolute", right: DIR, height: 1, backgroundColor: colors.border },
  rotuloX: { color: colors.textMuted, fontSize: 10 },
  unidade: { position: "absolute", right: DIR, top: -2, color: colors.textMuted, fontSize: 10 },
  barra: { flexDirection: "row", height: 10, borderRadius: 5, overflow: "hidden", backgroundColor: colors.border },
  legenda: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  legendaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendaCor: { width: 8, height: 8, borderRadius: 4 },
  legendaTexto: { color: colors.textMuted, fontSize: 12 },
});
