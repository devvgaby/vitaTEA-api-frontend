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
