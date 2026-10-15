import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMonitorado } from "@/context/MonitoradoContext";
import { useNotificacao } from "@/context/NotificacaoContext";
import { vincularDispositivo } from "@/lib/api/dispositivos";
import { enviarLeitura } from "@/lib/api/leituras";
import { listarTiposSinais } from "@/lib/api/limites";
import { extrairErro } from "@/lib/api/client";
import type { Dispositivo, TipoSinal } from "@/lib/api/types";
import {
  bluetoothSuportado,
  escolherWearable,
  conectarWearable,
  type ConexaoWearable,
} from "@/lib/ble/wearable";

const NOME_SINAL_FC = "Frequência Cardíaca";
const NOME_SINAL_SPO2 = "Saturação de Oxigênio";
// Intervalo mínimo entre envios à API
const INTERVALO_ENVIO_MS = 5000;
// Reconexão automática (RNF02): tentativas com espera crescente (2 s, 4 s, 6 s...)
const MAX_TENTATIVAS_RECONEXAO = 5;
const ESPERA_RECONEXAO_MS = 2000;

type StatusWearable = "desconectado" | "conectando" | "conectado" | "reconectando";

type WearableContextValue = {
  suportado: boolean;
  status: StatusWearable;
  bpm: number | null; // null = sem medição (sem dedo no sensor)
  spo2: number | null; // null = sem medição
  erro: string | null;
  conectar: () => Promise<void>;
  desconectar: () => void;
};

const WearableContext = createContext<WearableContextValue | null>(null);

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function WearableProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const { monitoradoAtivo, dispositivo, recarregar } = useMonitorado();
  const { notificarAlerta } = useNotificacao();

  const [status, setStatus] = useState<StatusWearable>("desconectado");
  const [bpm, setBpm] = useState<number | null>(null);
  const [spo2, setSpo2] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const conexaoRef = useRef<ConexaoWearable | null>(null);
  const ultimoEnvioRef = useRef(0);
  const ultimoEnvioSpo2Ref = useRef(0);
  // Muda a cada conectar/desconectar: reconexões de uma sessão antiga se cancelam sozinhas.
  const sessaoRef = useRef(0);

  const desconectar = useCallback(() => {
    sessaoRef.current += 1;
    conexaoRef.current?.desconectar();
    conexaoRef.current = null;
    setStatus("desconectado");
    setBpm(null);
    setSpo2(null);
  }, []);

  const conectar = useCallback(async () => {
    if (!monitoradoAtivo) return;
    setErro(null);

    let device: any;
    try {
      device = await escolherWearable();
    } catch (error) {
      const motivo = error instanceof Error ? error.message : String(error);
      // Fechar o seletor sem escolher não é erro; o resto é bloqueio do navegador.
      if (!/cancel/i.test(motivo)) {
        setErro(`O navegador não abriu a lista de dispositivos Bluetooth: ${motivo}`);
      }
      return;
    }

    sessaoRef.current += 1;
    const sessao = sessaoRef.current;
    setStatus("conectando");

    // Envia uma leitura à API; se ela gerar alerta alto/crítico, avisa o cuidador na hora.
    const enviar = (
      alvo: Dispositivo,
      tipo: TipoSinal,
      valor: number,
      ultimoEnvio: React.MutableRefObject<number>,
    ) => {
      if (valor <= 0 || Date.now() - ultimoEnvio.current < INTERVALO_ENVIO_MS) return;
      ultimoEnvio.current = Date.now();
      enviarLeitura(alvo, tipo.id_tipo_sinal, valor)
        .then(({ alerta }) => {
          setErro(null);
          if (alerta) notificarAlerta(alerta);
        })
        .catch((error) => setErro(extrairErro(error, "Não foi possível enviar a leitura para a API.")));
    };

    async function abrir(alvo: Dispositivo, tipoFC: TipoSinal, tipoSpo2?: TipoSinal) {
      conexaoRef.current = await conectarWearable(
        device,
        {
          onBpm: (valor) => {
            setBpm(valor > 0 ? valor : null);
            enviar(alvo, tipoFC, valor, ultimoEnvioRef);
          },
          onSpo2: (valor) => {
            setSpo2(valor > 0 ? valor : null);
            if (tipoSpo2) enviar(alvo, tipoSpo2, valor, ultimoEnvioSpo2Ref);
          },
        },
        () => {
          // Perda de conexão: só tenta reconectar se o cuidador não desconectou de propósito.
          if (sessaoRef.current !== sessao) return;
          conexaoRef.current = null;
          reconectar(alvo, tipoFC, tipoSpo2);
        },
      );
    }

    async function reconectar(alvo: Dispositivo, tipoFC: TipoSinal, tipoSpo2?: TipoSinal) {
      setStatus("reconectando");
      setBpm(null);
      setSpo2(null);

      for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_RECONEXAO; tentativa += 1) {
        await esperar(ESPERA_RECONEXAO_MS * tentativa);
        if (sessaoRef.current !== sessao) return;

        try {
          await abrir(alvo, tipoFC, tipoSpo2);
          if (sessaoRef.current !== sessao) {
            conexaoRef.current?.desconectar();
            return;
          }
          setStatus("conectado");
          setErro(null);
          return;
        } catch {
          // dispositivo ainda fora de alcance; tenta de novo
        }
      }

      if (sessaoRef.current === sessao) {
        conexaoRef.current = null;
        setStatus("desconectado");
        setErro("A conexão com o dispositivo foi perdida. Aproxime o wearable e conecte novamente.");
      }
    }

    try {
      if (dispositivo && dispositivo.codigo !== device.name) {
        throw new Error(
          `Este monitorado está vinculado ao dispositivo ${dispositivo.codigo}, não ao ${device.name}.`,
        );
      }

      // Primeiro uso: vincula o wearable ao monitorado usando o nome BLE como código.
      const alvo = dispositivo ?? (await vincularDispositivo(device.name, monitoradoAtivo.id_monitorado));
      if (!dispositivo) await recarregar();

      const tipos = await listarTiposSinais();
      const tipoFC = tipos.find((t) => t.nome === NOME_SINAL_FC);
      if (!tipoFC) throw new Error(`Tipo de sinal "${NOME_SINAL_FC}" não cadastrado na API.`);

      // O SpO2 é opcional: se o tipo não existir na API, só não é enviado.
      const tipoSpo2 = tipos.find((t) => t.nome === NOME_SINAL_SPO2);

      await abrir(alvo, tipoFC, tipoSpo2);
      setStatus("conectado");
    } catch (error) {
      desconectar();
      setErro(
        error instanceof Error && !("isAxiosError" in error)
          ? error.message
          : extrairErro(error, "Não foi possível conectar ao dispositivo."),
      );
    }
  }, [monitoradoAtivo, dispositivo, recarregar, desconectar, notificarAlerta]);

  // Encerra a conexão ao sair da conta ou trocar de monitorado.
  useEffect(() => {
    return () => desconectar();
  }, [token, monitoradoAtivo?.id_monitorado, desconectar]);

  return (
    <WearableContext.Provider
      value={{ suportado: bluetoothSuportado(), status, bpm, spo2, erro, conectar, desconectar }}
    >
      {children}
    </WearableContext.Provider>
  );
}

export function useWearable() {
  const ctx = useContext(WearableContext);
  if (!ctx) throw new Error("useWearable precisa estar dentro de <WearableProvider>");
  return ctx;
}
