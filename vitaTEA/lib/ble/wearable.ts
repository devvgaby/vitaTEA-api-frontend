// Conexão com o wearable (ESP32) via Bluetooth Low Energy, somente no Android.
// Usa react-native-ble-plx, que é um módulo nativo: funciona no APK / development
// build, mas NÃO no Expo Go nem no navegador.
import { PermissionsAndroid, Platform } from "react-native";
import { BleManager, State, type Device, type Subscription } from "react-native-ble-plx";

export const PREFIXO_NOME = "VitaTEA-";

// Serviço e característica padrão de Frequência Cardíaca (0x180D / 0x2A37)
const SERVICO_FC = "0000180d-0000-1000-8000-00805f9b34fb";
const CARACT_FC = "00002a37-0000-1000-8000-00805f9b34fb";

// Serviço de Oxímetro de Pulso (0x1822) e característica PLX Spot-check (0x2A5E).
const SERVICO_OXI = "00001822-0000-1000-8000-00805f9b34fb";
const CARACT_OXI = "00002a5e-0000-1000-8000-00805f9b34fb";

export type WearableEncontrado = { id: string; nome: string };

export type CallbacksWearable = {
  onBpm: (bpm: number) => void; // 0 = sem medição
  onSpo2: (spo2: number) => void; // 0 = sem medição
};

export type ConexaoWearable = {
  nome: string;
  desconectar: () => void;
};

let manager: BleManager | null = null;
let indisponivel = false;

// Cria o BleManager uma única vez. Se o módulo nativo não existir (Expo Go,
// web, iOS), devolve null e o app cai no vínculo manual pelo código.
function obterManager(): BleManager | null {
  if (Platform.OS !== "android" || indisponivel) return null;
  if (!manager) {
    try {
      manager = new BleManager();
    } catch {
      indisponivel = true;
      return null;
    }
  }
  return manager;
}

export function bluetoothSuportado() {
  return obterManager() !== null;
}

// Android 12+ (API 31): BLUETOOTH_SCAN e BLUETOOTH_CONNECT.
// Android 11 ou menor: a busca BLE exige localização.
// Com perguntar = false só confere, sem abrir o diálogo (usado na reconexão automática).
async function pedirPermissoes(perguntar: boolean): Promise<boolean> {
  if (!perguntar) {
    const necessarias =
      Number(Platform.Version) >= 31
        ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
        : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
    const concedidas = await Promise.all(necessarias.map((p) => PermissionsAndroid.check(p)));
    return concedidas.every(Boolean);
  }
  if (Number(Platform.Version) >= 31) {
    const resultado = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return Object.values(resultado).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
  }
  const resultado = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  return resultado === PermissionsAndroid.RESULTS.GRANTED;
}

// Confere permissões e se o Bluetooth está ligado. Lança erro com mensagem legível.
export async function prepararBluetooth({ perguntar = true } = {}): Promise<void> {
  const ble = obterManager();
  if (!ble) throw new Error("Bluetooth disponível apenas no app Android instalado (APK).");

  if (!(await pedirPermissoes(perguntar))) {
    throw new Error("Permita o acesso ao Bluetooth (dispositivos próximos) nas configurações do app.");
  }

  const estado = await ble.state();
  if (estado === State.PoweredOff) throw new Error("Ligue o Bluetooth do celular e tente de novo.");
  if (estado === State.Unauthorized) throw new Error("O app não tem permissão para usar o Bluetooth.");
  if (estado === State.Unsupported) throw new Error("Este celular não tem Bluetooth Low Energy.");
}

// Procura wearables VitaTEA por perto. Devolve a função que para a busca.
export function buscarWearables(
  onEncontrado: (wearable: WearableEncontrado) => void,
  onErro: (mensagem: string) => void,
): () => void {
  const ble = obterManager();
  if (!ble) {
    onErro("Bluetooth disponível apenas no app Android instalado (APK).");
    return () => {};
  }

  const vistos = new Set<string>();
  ble.startDeviceScan(null, { allowDuplicates: false }, (erro, device) => {
    if (erro) {
      onErro(`Falha ao procurar dispositivos: ${erro.message}`);
      ble.stopDeviceScan();
      return;
    }
    const nome = device?.name ?? device?.localName;
    if (!device || !nome?.startsWith(PREFIXO_NOME) || vistos.has(device.id)) return;
    vistos.add(device.id);
    onEncontrado({ id: device.id, nome });
  });

  return () => ble.stopDeviceScan();
}

// O ble-plx entrega os valores das características em base64.
const paraBytes = (base64: string) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

// Bit 0 das flags: 0 = BPM em uint8, 1 = BPM em uint16
function lerBpm(base64: string): number {
  const bytes = paraBytes(base64);
  return bytes[0] & 0x01 ? bytes[1] | (bytes[2] << 8) : bytes[1];
}

// Byte 0 = flags; bytes 1-2 = SpO2 em SFLOAT (valor inteiro, expoente 0).
function lerSpo2(base64: string): number {
  const bytes = paraBytes(base64);
  return (bytes[1] | (bytes[2] << 8)) & 0x0fff;
}

// Conecta e passa a chamar onBpm / onSpo2 a cada notificação (0 = sem medição).
export async function conectarWearable(
  wearable: WearableEncontrado,
  { onBpm, onSpo2 }: CallbacksWearable,
  onDesconectado: () => void,
): Promise<ConexaoWearable> {
  const ble = obterManager();
  if (!ble) throw new Error("Bluetooth disponível apenas no app Android instalado (APK).");

  ble.stopDeviceScan();

  let device: Device = await ble.connectToDevice(wearable.id, { timeout: 10000 });
  device = await device.discoverAllServicesAndCharacteristics();

  let encerrado = false;
  const subs: Subscription[] = [];

  subs.push(
    device.monitorCharacteristicForService(SERVICO_FC, CARACT_FC, (erro, caract) => {
      if (erro || !caract?.value) return;
      onBpm(lerBpm(caract.value));
    }),
  );

  // Oxímetro: se o firmware for antigo e não tiver o serviço, segue só com o BPM.
  const servicos = await device.services();
  if (servicos.some((s) => s.uuid.toLowerCase() === SERVICO_OXI)) {
    subs.push(
      device.monitorCharacteristicForService(SERVICO_OXI, CARACT_OXI, (erro, caract) => {
        if (erro || !caract?.value) return;
        onSpo2(lerSpo2(caract.value));
      }),
    );
  }

  subs.push(
    ble.onDeviceDisconnected(device.id, () => {
      if (encerrado) return;
      encerrado = true;
      subs.forEach((s) => s.remove());
      onDesconectado();
    }),
  );

  return {
    nome: wearable.nome,
    desconectar: () => {
      encerrado = true;
      subs.forEach((s) => s.remove());
      ble.cancelDeviceConnection(device.id).catch(() => {});
    },
  };
}
