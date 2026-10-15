import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { MonitoradoProvider } from "@/context/MonitoradoContext";
import { WearableProvider } from "@/context/WearableContext";
import { NotificacaoProvider } from "@/context/NotificacaoContext";
import { AlertaBanner } from "@/components/vitatea/alerta-banner";
import { colors } from "@/constants/vitatea-theme";

function RootNavigator() {
  const { cuidador, carregando } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (carregando) return;

    const grupoAtual = segments[0];

    const emAuth = grupoAtual === "(auth)";
    const emApp = grupoAtual === "(app)";

    if (!cuidador && emApp) {
      router.replace("/login");
      return;
    }

    if (cuidador && emAuth) {
      router.replace("/(app)");
      return;
    }
  }, [cuidador, carregando, segments, router]);

  if (carregando) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
      </View>
    );
  }

  return (
    <>
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.bg,
        },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />

      <Stack.Screen
        name="add-monitored"
        options={{ presentation: "modal" }}
      />

      <Stack.Screen
        name="link-device"
        options={{ presentation: "modal" }}
      />

      <Stack.Screen
        name="limits"
        options={{ presentation: "modal" }}
      />

      <Stack.Screen
        name="edit-account"
        options={{ presentation: "modal" }}
      />

      <Stack.Screen
        name="change-password"
        options={{ presentation: "modal" }}
      />

      <Stack.Screen
        name="edit-monitored"
        options={{ presentation: "modal" }}
      />

      <Stack.Screen
        name="report"
        options={{ presentation: "modal" }}
      />
    </Stack>
    {cuidador ? <AlertaBanner /> : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <MonitoradoProvider>
        <NotificacaoProvider>
          <WearableProvider>
            <RootNavigator />
            <StatusBar style="light" />
          </WearableProvider>
        </NotificacaoProvider>
      </MonitoradoProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
});