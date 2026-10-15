// Conexão com o wearable (ESP32) via Web Bluetooth. Funciona apenas no
// navegador (Chrome/Edge) em localhost ou HTTPS; no app nativo seria preciso
// um development build com react-native-ble-plx.

export const PREFIXO_NOME = "VitaTEA-";

// Serviço e característica padrão de Frequência Cardíaca (0x180D / 0x2A37)
const SERVICO_FC = "heart_rate";
const CARACT_FC = "heart_rate_measurement";

// Serviço de Oxímetro de Pulso (0x1822) e característica PLX Spot-check (0x2A5E).
// Usa os números porque nem todo navegador conhece esses nomes.
const SERVICO_OXI = 0x1822;
const CARACT_OXI = 0x2a5e;

export type CallbacksWearable = {
  onBpm: (bpm: number) => void; // 0 = sem medição
  onSpo2: (spo2: number) => void; // 0 = sem medição
};

export type ConexaoWearable = {
  nome: string;
  desconectar: () => void;
};

function bluetooth(): any {
  return typeof navigator !== "undefined" ? (navigator as any).bluetooth : undefined;
}

export function bluetoothSuportado() {
  return !!bluetooth();
}

// Abre o seletor de dispositivos do navegador (precisa ser chamado a partir de
// um clique do usuário) e devolve o wearable escolhido, ainda sem conectar.
export async function escolherWearable(): Promise<any> {
  return bluetooth().requestDevice({
    filters: [{ namePrefix: PREFIXO_NOME }],
    optionalServices: [SERVICO_FC, SERVICO_OXI],
  });
}

// Conecta e passa a chamar onBpm / onSpo2 a cada notificação (0 = sem medição).
export async function conectarWearable(
  device: any,
  { onBpm, onSpo2 }: CallbacksWearable,
  onDesconectado: () => void,
): Promise<ConexaoWearable> {
  const server = await device.gatt.connect();
  const servico = await server.getPrimaryService(SERVICO_FC);
  const caract = await servico.getCharacteristic(CARACT_FC);

  const aoMudar = (evento: any) => {
    const valor: DataView = evento.target.value;
    // Bit 0 das flags: 0 = BPM em uint8, 1 = BPM em uint16
    const bpm = valor.getUint8(0) & 0x01 ? valor.getUint16(1, true) : valor.getUint8(1);
    onBpm(bpm);
  };

  // Oxímetro: se o firmware for antigo e não tiver o serviço, segue só com o BPM.
  let caractOxi: any = null;
  try {
    const servicoOxi = await server.getPrimaryService(SERVICO_OXI);
    caractOxi = await servicoOxi.getCharacteristic(CARACT_OXI);
  } catch {
    caractOxi = null;
  }

  const aoMudarOxi = (evento: any) => {
    const valor: DataView = evento.target.value;
    // Byte 0 = flags; bytes 1-2 = SpO2 em SFLOAT (valor inteiro, expoente 0).
    onSpo2(valor.getUint16(1, true) & 0x0fff);
  };

  caract.addEventListener("characteristicvaluechanged", aoMudar);
  device.addEventListener("gattserverdisconnected", onDesconectado, { once: true });
  await caract.startNotifications();

  if (caractOxi) {
    caractOxi.addEventListener("characteristicvaluechanged", aoMudarOxi);
    await caractOxi.startNotifications();
  }

  return {
    nome: device.name,
    desconectar: () => {
      caract.removeEventListener("characteristicvaluechanged", aoMudar);
      caractOxi?.removeEventListener("characteristicvaluechanged", aoMudarOxi);
      if (device.gatt.connected) device.gatt.disconnect();
    },
  };
}