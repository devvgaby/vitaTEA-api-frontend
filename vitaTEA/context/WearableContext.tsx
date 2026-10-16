import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
import { useMonitorado } from "@/context/MonitoradoContext";
import { useNotificacao } from "@/context/NotificacaoContext";
import { vincularDispositivo } from "@/lib/api/dispositivos";
import { enviarLeitura } from "@/lib/api/leituras";
import { listarTiposSinais } from "@/lib/api/limites";
import { extrairErro } from "@/lib/api/client";
import type { Dispositivo } from "@/lib/api/types";
import {
  bluetoothSuportado,
  prepararBluetooth,
  buscarWearables,
  conectarWearable,
  type ConexaoWearable,
  type WearableEncontrado,
} from "@/lib/ble/wearable";

const NOME_SINAL_FC = "Frequência Cardíaca";
const NOME_SINAL_SPO2 = "Saturação de Oxigênio";
// Intervalo mínimo entre envios à API
const INTERVALO_ENVIO_MS = 5000;
// Tempo máximo de cada busca por wearables
const DURACAO_BUSCA_MS = 12000;
// Espera antes de cada nova tentativa de reconexão (a última se repete)
const ESPERAS_RECONEXAO_MS = [2000, 5000, 10000, 20000, 30000];

// Guarda o ID Bluetooth do wearable de cada dispositivo vinculado, para
// reconectar sem precisar procurar de novo.
const chaveWearable = (codigo: string) => `vitatea:wearable:${codigo}`;

type StatusWearable = "desconectado" | "conectando" | "conectado" | "reconectando";

type WearableContextValue = {
  suportado: boolean;
  status: StatusWearable;
  bpm: number | null; // null = sem medição (sem dedo no sensor)
  spo2: number | null; // null = sem medição
  erro: string | null;
  buscando: boolean;
  encontrados: WearableEncontrado[];
  buscar: () => Promise<void>;
  pararBusca: () => void;
  conectar: (wearable: WearableEncontrado) => Promise<void>;
  desconectar: () => void;
};

const WearableContext = createContext<WearableContextValue | null>(null);

function mensagemDeErro(error: unknown, fallback: string) {
  return error instanceof Error && !("isAxiosError" in error) ? error.message : extrairErro(error, fallback);
}

export function WearableProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const { monitoradoAtivo, dispositivo, recarregar } = useMonitorado();
  const { notificarAlerta } = useNotificacao();

  const [status, setStatus] = useState<StatusWearable>("desconectado");
  const [bpm, setBpm] = useState<number | null>(null);
  const [spo2, setSpo2] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [encontrados, setEncontrados] = useState<WearableEncontrado[]>([]);

  const conexaoRef = useRef<ConexaoWearable | null>(null);
  const ultimoEnvioRef = useRef(0);
  const ultimoEnvioSpo2Ref = useRef(0);
  const pararBuscaRef = useRef<(() => void) | null>(null);
  const timerBuscaRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cada conexão manual, desconexão, logout ou troca de monitorado abre uma
  // "sessão" nova; tentativas de reconexão de uma sessão antiga são descartadas.
  const sessaoRef = useRef(0);
  const timerReconexaoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tiposRef = useRef<{ fc: number; spo2: number | null } | null>(null);
  const notificarAlertaRef = useRef(notificarAlerta);
  useEffect(() => {
    notificarAlertaRef.current = notificarAlerta;
  }, [notificarAlerta]);
  const autoConexaoFeitaRef = useRef<string | null>(null);

  const pararBusca = useCallback(() => {
    if (timerBuscaRef.current) clearTimeout(timerBuscaRef.current);
    timerBuscaRef.current = null;
    pararBuscaRef.current?.();
    pararBuscaRef.current = null;
    setBuscando(false);
  }, []);

  const buscar = useCallback(async () => {
    pararBusca();
    setErro(null);
    setEncontrados([]);
    try {
      await prepararBluetooth();
    } catch (error) {
      setErro(error instanceof Error ? error.message : String(error));
      return;
    }

    setBuscando(true);
    pararBuscaRef.current = buscarWearables(
      (wearable) => setEncontrados((lista) => [...lista, wearable]),
      (mensagem) => {
        setErro(mensagem);
        pararBusca();
      },
    );
    timerBuscaRef.current = setTimeout(pararBusca, DURACAO_BUSCA_MS);
  }, [pararBusca]);

  const cancelarReconexao = useCallback(() => {
    if (timerReconexaoRef.current) clearTimeout(timerReconexaoRef.current);
    timerReconexaoRef.current = null;
  }, []);

  // Encerra tudo e invalida a sessão: nenhuma reconexão acontece depois disso.
  const desconectar = useCallback(() => {
    sessaoRef.current += 1;
    cancelarReconexao();
    conexaoRef.current?.desconectar();
    conexaoRef.current = null;
    setStatus("desconectado");
    setBpm(null);
    setSpo2(null);
  }, [cancelarReconexao]);

  // IDs dos tipos de sinal na API. O SpO2 é opcional: se não existir, só não é enviado.
  const obterTipos = useCallback(async () => {
    if (tiposRef.current) return tiposRef.current;
    const tipos = await listarTiposSinais();
    const tipoFC = tipos.find((t) => t.nome === NOME_SINAL_FC);
    if (!tipoFC) throw new Error(`Tipo de sinal "${NOME_SINAL_FC}" não cadastrado na API.`);
    const tipoSpo2 = tipos.find((t) => t.nome === NOME_SINAL_SPO2);
    tiposRef.current = { fc: tipoFC.id_tipo_sinal, spo2: tipoSpo2?.id_tipo_sinal ?? null };
    return tiposRef.current;
  }, []);

  // Envia uma leitura à API; se ela gerar alerta alto/crítico, avisa o cuidador na hora.
  const enviar = useCallback(
    (alvo: Dispositivo, idTipo: number, valor: number, ultimoEnvio: React.MutableRefObject<number>) => {
      if (valor <= 0 || Date.now() - ultimoEnvio.current < INTERVALO_ENVIO_MS) return;
      ultimoEnvio.current = Date.now();
      enviarLeitura(alvo, idTipo, valor)
        .then(({ alerta }) => {
          setErro(null);
          if (alerta) notificarAlertaRef.current(alerta);
        })
        .catch((error) => setErro(extrairErro(error, "Não foi possível enviar a leitura para a API.")));
    },
    [],
  );

  // Conecta ao wearable e, se a conexão cair sem o usuário pedir, agenda a reconexão.
  const abrirConexao = useCallback(
    async (device: WearableEncontrado, alvo: Dispositivo, sessao: number) => {
      const tipos = await obterTipos();

      const conexao = await conectarWearable(
        device,
        {
          onBpm: (valor) => {
            setBpm(valor > 0 ? valor : null);
            enviar(alvo, tipos.fc, valor, ultimoEnvioRef);
          },
          onSpo2: (valor) => {
            setSpo2(valor > 0 ? valor : null);
            if (tipos.spo2 !== null) enviar(alvo, tipos.spo2, valor, ultimoEnvioSpo2Ref);
          },
        },
        () => {
          conexaoRef.current = null;
          setBpm(null);
          setSpo2(null);
          if (sessaoRef.current === sessao) agendarReconexao(device, alvo, sessao, 0);
        },
      );

      // A sessão mudou enquanto conectava (logout, troca de monitorado, desconectar).
      if (sessaoRef.current !== sessao) {
        conexao.desconectar();
        return;
      }

      conexaoRef.current = conexao;
      setStatus("conectado");
      AsyncStorage.setItem(chaveWearable(alvo.codigo), device.id).catch(() => {});
    },
    // agendarReconexao é declarada abaixo e só usa refs e setters estáveis.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [obterTipos, enviar],
  );

  // Tenta de novo depois de uma espera crescente, até conectar ou a sessão mudar.
  function agendarReconexao(device: WearableEncontrado, alvo: Dispositivo, sessao: number, tentativa: number) {
    cancelarReconexao();
    setStatus("reconectando");
    const espera = ESPERAS_RECONEXAO_MS[Math.min(tentativa, ESPERAS_RECONEXAO_MS.length - 1)];

    timerReconexaoRef.current = setTimeout(async () => {
      timerReconexaoRef.current = null;
      if (sessaoRef.current !== sessao) return;
      try {
        await prepararBluetooth({ perguntar: false });
        await abrirConexao(device, alvo, sessao);
      } catch {
        // Wearable desligado, fora de alcance ou Bluetooth desligado: tenta de novo.
        if (sessaoRef.current === sessao) agendarReconexao(device, alvo, sessao, tentativa + 1);
      }
    }, tentativa < 0 ? 0 : espera);
  }

  const conectar = useCallback(
    async (device: WearableEncontrado) => {
      if (!monitoradoAtivo) return;
      pararBusca();
      cancelarReconexao();
      conexaoRef.current?.desconectar();
      conexaoRef.current = null;
      const sessao = ++sessaoRef.current;

      setErro(null);
      setStatus("conectando");
      try {
        if (dispositivo && dispositivo.codigo !== device.nome) {
          throw new Error(
            `Este monitorado está vinculado ao dispositivo ${dispositivo.codigo}, não ao ${device.nome}.`,
          );
        }

        // Primeiro uso: vincula o wearable ao monitorado usando o nome BLE como código.
        const alvo = dispositivo ?? (await vincularDispositivo(device.nome, monitoradoAtivo.id_monitorado));
        if (!dispositivo) {
          // Evita que a auto-conexão dispare de novo quando o vínculo recarregar.
          autoConexaoFeitaRef.current = `${monitoradoAtivo.id_monitorado}:${alvo.codigo}`;
          await recarregar();
        }

        await abrirConexao(device, alvo, sessao);
      } catch (error) {
        if (sessaoRef.current === sessao) desconectar();
        setErro(mensagemDeErro(error, "Não foi possível conectar ao dispositivo."));
      }
    },
    [monitoradoAtivo, dispositivo, recarregar, desconectar, pararBusca, cancelarReconexao, abrirConexao],
  );

  // Encerra a conexão ao sair da conta ou trocar de monitorado.
  useEffect(() => {
    return () => {
      pararBusca();
      desconectar();
    };
  }, [token, monitoradoAtivo?.id_monitorado, desconectar, pararBusca]);

  // Ao abrir o app (ou trocar de monitorado), conecta sozinho ao wearable já
  // vinculado, se ele já foi conectado antes neste celular.
  useEffect(() => {
    if (!token || !monitoradoAtivo || !dispositivo || !bluetoothSuportado()) return;

    const chave = `${monitoradoAtivo.id_monitorado}:${dispositivo.codigo}`;
    if (autoConexaoFeitaRef.current === chave) return;
    autoConexaoFeitaRef.current = chave;

    const sessao = sessaoRef.current;
    AsyncStorage.getItem(chaveWearable(dispositivo.codigo))
      .then((id) => {
        if (!id || sessaoRef.current !== sessao || conexaoRef.current) return;
        agendarReconexao({ id, nome: dispositivo.codigo }, dispositivo, sessao, -1);
      })
      .catch(() => {});
    // agendarReconexao só usa refs e setters estáveis.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, monitoradoAtivo?.id_monitorado, dispositivo?.codigo]);

  return (
    <WearableContext.Provider
      value={{
        suportado: bluetoothSuportado(),
        status,
        bpm,
        spo2,
        erro,
        buscando,
        encontrados,
        buscar,
        pararBusca,
        conectar,
        desconectar,
      }}
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
