// No navegador não há Bluetooth: a conexão com o wearable é só no app Android.
// Este arquivo evita carregar o módulo nativo (react-native-ble-plx) na web.
export const PREFIXO_NOME = "VitaTEA-";

export type WearableEncontrado = { id: string; nome: string };

export type CallbacksWearable = {
  onBpm: (bpm: number) => void;
  onSpo2: (spo2: number) => void;
};

export type ConexaoWearable = {
  nome: string;
  desconectar: () => void;
};

const MENSAGEM = "Bluetooth disponível apenas no app Android instalado (APK).";

export function bluetoothSuportado() {
  return false;
}

export async function prepararBluetooth(_opcoes?: { perguntar?: boolean }): Promise<void> {
  throw new Error(MENSAGEM);
}

export function buscarWearables(
  _onEncontrado: (wearable: WearableEncontrado) => void,
  onErro: (mensagem: string) => void,
): () => void {
  onErro(MENSAGEM);
  return () => {};
}

export async function conectarWearable(): Promise<ConexaoWearable> {
  throw new Error(MENSAGEM);
}
