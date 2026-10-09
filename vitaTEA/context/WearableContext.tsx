import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMonitorado } from "@/context/MonitoradoContext";
import { vincularDispositivo } from "@/lib/api/dispositivos";
import { enviarLeitura } from "@/lib/api/leituras";
import { listarTiposSinais } from "@/lib/api/limites";
import { extrairErro } from "@/lib/api/client";
import {
  bluetoothSuportado,
  escolherWearable,
  conectarWearable,
  type ConexaoWearable,
} from "@/lib/ble/wearable";

const NOME_SINAL_FC = "Frequência Cardíaca";
// Intervalo mínimo entre envios à API
const INTERVALO_ENVIO_MS = 5000;

type StatusWearable = "desconectado" | "conectando" | "conectado";

type WearableContextValue = {
  suportado: boolean;
  status: StatusWearable;
  bpm: number | null; // null = sem medição (sem dedo no sensor)
  erro: string | null;
  conectar: () => Promise<void>;
  desconectar: () => void;
};

const WearableContext = createContext<WearableContextValue | null>(null);

export function WearableProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const { monitoradoAtivo, dispositivo, recarregar } = useMonitorado();

  const [status, setStatus] = useState<StatusWearable>("desconectado");
  const [bpm, setBpm] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const conexaoRef = useRef<ConexaoWearable | null>(null);
  const ultimoEnvioRef = useRef(0);

  const desconectar = useCallback(() => {
    conexaoRef.current?.desconectar();
    conexaoRef.current = null;
    setStatus("desconectado");
    setBpm(null);
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

    setStatus("conectando");
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

      conexaoRef.current = await conectarWearable(
        device,
        (valor) => {
          setBpm(valor > 0 ? valor : null);
          if (valor <= 0 || Date.now() - ultimoEnvioRef.current < INTERVALO_ENVIO_MS) return;

          ultimoEnvioRef.current = Date.now();
          enviarLeitura(alvo, tipoFC.id_tipo_sinal, valor)
            .then(() => setErro(null))
            .catch((error) => setErro(extrairErro(error, "Não foi possível enviar a leitura para a API.")));
        },
        () => {
          conexaoRef.current = null;
          setStatus("desconectado");
          setBpm(null);
        },
      );
      setStatus("conectado");
    } catch (error) {
      desconectar();
      setErro(
        error instanceof Error && !("isAxiosError" in error)
          ? error.message
          : extrairErro(error, "Não foi possível conectar ao dispositivo."),
      );
    }
  }, [monitoradoAtivo, dispositivo, recarregar, desconectar]);

  // Encerra a conexão ao sair da conta ou trocar de monitorado.
  useEffect(() => {
    return () => desconectar();
  }, [token, monitoradoAtivo?.id_monitorado, desconectar]);

  return (
    <WearableContext.Provider
      value={{ suportado: bluetoothSuportado(), status, bpm, erro, conectar, desconectar }}
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
