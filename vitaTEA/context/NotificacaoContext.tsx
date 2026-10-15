import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Platform, Vibration } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useMonitorado } from "@/context/MonitoradoContext";
import { listarAlertasPorMonitorado } from "@/lib/api/alertas";
import type { Alerta, NivelCriticidade } from "@/lib/api/types";

// Notificação de emergência (RN08/RF12/RF17).
//
// Quando surge um alerta de nível alto ou crítico o cuidador é avisado na hora:
// faixa vermelha no topo do app, som, vibração (celular) e notificação do
// navegador (se ele permitiu). O aviso vem de duas fontes:
//  - da resposta da API quando este próprio app envia a leitura;
//  - de uma consulta periódica, para quando o dispositivo está sendo
//    monitorado em outro aparelho (por exemplo, outro cuidador).
// Além disso, a API envia e-mail aos cuidadores (e SMS aos contatos, se configurado).

const INTERVALO_CONSULTA_MS = 15000;
const DURACAO_AVISO_MS = 12000;
const NIVEIS_QUE_AVISAM: NivelCriticidade[] = ["alto", "critico"];

type Permissao = "granted" | "denied" | "default" | "unsupported";

export type AvisoEmergencia = {
  id_alerta: number;
  nivel: NivelCriticidade;
  titulo: string;
  mensagem: string;
};

type NotificacaoContextValue = {
  permissao: Permissao;
  ativarNotificacoes: () => Promise<void>;
  notificarAlerta: (alerta: Alerta) => void;
  aviso: AvisoEmergencia | null;
  dispensar: () => void;
};

const NotificacaoContext = createContext<NotificacaoContextValue | null>(null);

const lerPermissao = (): Permissao => {
  if (Platform.OS !== "web" || typeof Notification === "undefined") return "unsupported";
  return Notification.permission as Permissao;
};

// Dois bipes curtos (só no navegador). Pode ser bloqueado até o usuário interagir com a página.
function tocarSom(nivel: NivelCriticidade) {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  try {
    const Contexto = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Contexto) return;
    const audio = new Contexto();
    const frequencia = nivel === "critico" ? 880 : 660;
    [0, 0.28].forEach((atraso) => {
      const oscilador = audio.createOscillator();
      const ganho = audio.createGain();
      oscilador.type = "sine";
      oscilador.frequency.value = frequencia;
      ganho.gain.value = 0.15;
      oscilador.connect(ganho);
      ganho.connect(audio.destination);
      oscilador.start(audio.currentTime + atraso);
      oscilador.stop(audio.currentTime + atraso + 0.2);
    });
    setTimeout(() => audio.close?.(), 1000);
  } catch {
    // sem som: o aviso visual continua funcionando
  }
}

export function NotificacaoProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const { monitoradoAtivo } = useMonitorado();

  const [permissao, setPermissao] = useState<Permissao>(lerPermissao());
  const [aviso, setAviso] = useState<AvisoEmergencia | null>(null);

  const notificadosRef = useRef<Set<number>>(new Set());
  const ultimoIdRef = useRef<number | null>(null);
  const temporizadorRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nomeRef = useRef<string>("");
  nomeRef.current = monitoradoAtivo?.nome ?? "";

  const dispensar = useCallback(() => {
    if (temporizadorRef.current) clearTimeout(temporizadorRef.current);
    temporizadorRef.current = null;
    setAviso(null);
  }, []);

  const disparar = useCallback(
    (alerta: Alerta) => {
      if (notificadosRef.current.has(alerta.id_alerta)) return;
      notificadosRef.current.add(alerta.id_alerta);

      const nivel = alerta.nivel_criticidade;
      const titulo = `Alerta ${nivel === "critico" ? "crítico" : "alto"}${nomeRef.current ? ` - ${nomeRef.current}` : ""}`;

      setAviso({ id_alerta: alerta.id_alerta, nivel, titulo, mensagem: alerta.mensagem });
      if (temporizadorRef.current) clearTimeout(temporizadorRef.current);
      temporizadorRef.current = setTimeout(() => setAviso(null), DURACAO_AVISO_MS);

      tocarSom(nivel);
      if (Platform.OS !== "web") Vibration.vibrate([0, 300, 150, 300]);

      if (Platform.OS === "web" && typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          const notificacao = new Notification(titulo, {
            body: alerta.mensagem,
            tag: `alerta-${alerta.id_alerta}`,
            requireInteraction: nivel === "critico",
          });
          notificacao.onclick = () => {
            window.focus();
            notificacao.close();
          };
        } catch {
          // o navegador pode recusar; o aviso dentro do app já foi mostrado
        }
      }
    },
    [],
  );

  // Alerta devolvido pela API quando este app envia uma leitura.
  const notificarAlerta = useCallback(
    (alerta: Alerta) => {
      ultimoIdRef.current = Math.max(ultimoIdRef.current ?? 0, alerta.id_alerta);
      if (NIVEIS_QUE_AVISAM.includes(alerta.nivel_criticidade)) disparar(alerta);
    },
    [disparar],
  );

  const ativarNotificacoes = useCallback(async () => {
    if (Platform.OS !== "web" || typeof Notification === "undefined") return;
    const resultado = await Notification.requestPermission();
    setPermissao(resultado as Permissao);
  }, []);

  // Consulta periódica: avisa sobre alertas novos gerados por outro aparelho.
  useEffect(() => {
    if (!token || !monitoradoAtivo) return;

    ultimoIdRef.current = null;
    notificadosRef.current = new Set();
    let ativo = true;

    const consultar = async () => {
      try {
        const alertas = await listarAlertasPorMonitorado(monitoradoAtivo.id_monitorado);
        if (!ativo) return;

        const maiorId = alertas.reduce((maior, a) => Math.max(maior, a.id_alerta), 0);

        // Primeira consulta: só marca o ponto de partida, sem avisar sobre o histórico.
        if (ultimoIdRef.current === null) {
          ultimoIdRef.current = maiorId;
          return;
        }

        const novos = alertas
          .filter((a) => a.id_alerta > (ultimoIdRef.current ?? 0) && !a.visualizado)
          .filter((a) => NIVEIS_QUE_AVISAM.includes(a.nivel_criticidade))
          .sort((a, b) => a.id_alerta - b.id_alerta);

        ultimoIdRef.current = Math.max(ultimoIdRef.current, maiorId);
        novos.forEach(disparar);
      } catch {
        // sem conexão com a API agora; tenta de novo na próxima rodada
      }
    };

    consultar();
    const intervalo = setInterval(consultar, INTERVALO_CONSULTA_MS);

    return () => {
      ativo = false;
      clearInterval(intervalo);
    };
  }, [token, monitoradoAtivo?.id_monitorado, disparar]);

  useEffect(() => () => {
    if (temporizadorRef.current) clearTimeout(temporizadorRef.current);
  }, []);

  return (
    <NotificacaoContext.Provider value={{ permissao, ativarNotificacoes, notificarAlerta, aviso, dispensar }}>
      {children}
    </NotificacaoContext.Provider>
  );
}

export function useNotificacao() {
  const ctx = useContext(NotificacaoContext);
  if (!ctx) throw new Error("useNotificacao precisa estar dentro de <NotificacaoProvider>");
  return ctx;
}
