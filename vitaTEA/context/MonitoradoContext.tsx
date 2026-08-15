import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
import { buscarMonitorado, listarVinculos } from "@/lib/api/monitorados";
import { listarDispositivos, statusDispositivo } from "@/lib/api/dispositivos";
import type { Monitorado, Dispositivo, DispositivoStatus } from "@/lib/api/types";
import { extrairErro } from "@/lib/api/client";

const MONITORADO_ATIVO_KEY = "vitatea:monitorado_ativo";

type MonitoradoContextValue = {
  monitorados: Monitorado[];
  monitoradoAtivo: Monitorado | null;
  dispositivo: Dispositivo | null;
  statusDevice: DispositivoStatus | null;
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
  selecionarMonitorado: (m: Monitorado) => Promise<void>;
};

const MonitoradoContext = createContext<MonitoradoContextValue | null>(null);

export function MonitoradoProvider({ children }: { children: React.ReactNode }) {
  const { cuidador, token } = useAuth();
  const [monitorados, setMonitorados] = useState<Monitorado[]>([]);
  const [monitoradoAtivo, setMonitoradoAtivo] = useState<Monitorado | null>(null);
  const [dispositivo, setDispositivo] = useState<Dispositivo | null>(null);
  const [statusDevice, setStatusDevice] = useState<DispositivoStatus | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarDispositivo = useCallback(async (idMonitorado: number) => {
    try {
      const dispositivos = await listarDispositivos();
      const doMonitorado = dispositivos.find((d) => d.id_monitorado === idMonitorado) ?? null;
      setDispositivo(doMonitorado);

      if (doMonitorado) {
        const st = await statusDispositivo(doMonitorado.id_dispositivo);
        setStatusDevice(st);
      } else {
        setStatusDevice(null);
      }
    } catch {
      setDispositivo(null);
      setStatusDevice(null);
    }
  }, []);

  const recarregar = useCallback(async () => {
    if (!cuidador) return;
    setCarregando(true);
    setErro(null);
    try {
      const vinculos = await listarVinculos();
      const meusIds = vinculos
        .filter((v) => v.id_cuidador === cuidador.id_cuidador)
        .map((v) => v.id_monitorado);

      const lista = await Promise.all(meusIds.map((id) => buscarMonitorado(id)));
      setMonitorados(lista);

      const savedId = await AsyncStorage.getItem(MONITORADO_ATIVO_KEY);
      const ativo =
        lista.find((m) => String(m.id_monitorado) === savedId) ?? lista[0] ?? null;

      setMonitoradoAtivo(ativo);
      if (ativo) await carregarDispositivo(ativo.id_monitorado);
    } catch (error) {
      setErro(extrairErro(error, "Não foi possível carregar os monitorados."));
    } finally {
      setCarregando(false);
    }
  }, [cuidador, carregarDispositivo]);

  const selecionarMonitorado = useCallback(
    async (m: Monitorado) => {
      setMonitoradoAtivo(m);
      await AsyncStorage.setItem(MONITORADO_ATIVO_KEY, String(m.id_monitorado));
      await carregarDispositivo(m.id_monitorado);
    },
    [carregarDispositivo],
  );

  useEffect(() => {
    if (token) recarregar();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MonitoradoContext.Provider
      value={{
        monitorados,
        monitoradoAtivo,
        dispositivo,
        statusDevice,
        carregando,
        erro,
        recarregar,
        selecionarMonitorado,
      }}
    >
      {children}
    </MonitoradoContext.Provider>
  );
}

export function useMonitorado() {
  const ctx = useContext(MonitoradoContext);
  if (!ctx) throw new Error("useMonitorado precisa estar dentro de <MonitoradoProvider>");
  return ctx;
}
