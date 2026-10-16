import { Alert, Platform } from "react-native";

// O Alert.alert do React Native não funciona no navegador (react-native-web),
// então no web usamos o confirm nativo do navegador.
export function confirmar(
  titulo: string,
  mensagem: string,
  { confirmarTexto = "Confirmar", destrutivo = false }: { confirmarTexto?: string; destrutivo?: boolean } = {},
): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(typeof window !== "undefined" && window.confirm(`${titulo}\n\n${mensagem}`));
  }

  return new Promise((resolve) => {
    Alert.alert(titulo, mensagem, [
      { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
      { text: confirmarTexto, style: destrutivo ? "destructive" : "default", onPress: () => resolve(true) },
    ]);
  });
}

// Aviso simples (sem escolha).
export function avisar(titulo: string, mensagem: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.alert(`${titulo}\n\n${mensagem}`);
    return;
  }
  Alert.alert(titulo, mensagem);
}
