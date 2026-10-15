export type Cuidador = {
  id_cuidador: number;
  nome: string;
  email: string;
};

export type Monitorado = {
  id_monitorado: number;
  nome: string;
  idade: number;
  nivel_tea: "2" | "3";
};

export type ContatoEmergencia = {
  id_contato_emergencia: number;
  id_monitorado: number;
  nome: string;
  telefone: string;
  parentesco: string;
};

export type Dispositivo = {
  id_dispositivo: number;
  id_monitorado: number;
  codigo: string;
  ultima_conexao: string | null;
};

export type DispositivoStatus = {
  id_dispositivo: number;
  conectado: boolean;
  ultima_conexao: string | null;
};

export type TipoSinal = {
  id_tipo_sinal: number;
  nome: string;
  unidade_medida: string;
};

export type LimiteSinal = {
  id_limite_sinal: number;
  id_monitorado: number;
  id_tipo_sinal: number;
  valor_min: number;
  valor_max: number;
};

export type LeituraDispositivo = {
  id_leitura_dispositivo: number;
  id_dispositivo: number;
  id_tipo_sinal: number;
  valor: number;
  data_hora: string;
};

export type NivelCriticidade = "baixo" | "medio" | "alto" | "critico";

export type Alerta = {
  id_alerta: number;
  id_leitura_dispositivo: number;
  mensagem: string;
  nivel_criticidade: NivelCriticidade;
  data_hora: string;
  visualizado: boolean;
  LeituraDispositivo?: LeituraDispositivo & {
    Dispositivo?: Dispositivo;
    TipoSinal?: TipoSinal;
  };
};

export type PeriodoRelatorio = "1h" | "6h" | "24h" | "7d" | "30d";

export type PontoSerie = { t: string; media: number; min: number; max: number; n: number };

export type ResumoSinal = {
  id_tipo_sinal: number;
  nome: string;
  unidade_medida: string;
  limites: { min: number; max: number; personalizado: boolean } | null;
  total: number;
  media: number | null;
  minimo: number | null;
  maximo: number | null;
  fora_dos_limites: number;
  percentual_fora: number;
  serie: PontoSerie[];
};

export type Relatorio = {
  monitorado: Monitorado;
  periodo: { desde: string; ate: string };
  gerado_em: string;
  total_leituras: number;
  sinais: ResumoSinal[];
  alertas: {
    total: number;
    por_nivel: Record<NivelCriticidade, number>;
    recentes: { id_alerta: number; mensagem: string; nivel_criticidade: NivelCriticidade; data_hora: string }[];
  };
};
