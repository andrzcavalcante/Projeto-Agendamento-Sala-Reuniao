import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  
  useEffect(() => {
    solicitarPermissaoNotificacao();
  }, []);

  async function solicitarPermissaoNotificacao() {
    const { status: statusExistente } = await Notifications.getPermissionsAsync();
    let statusFinal = statusExistente;
    
    if (statusExistente !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      statusFinal = status;
    }
    
    if (statusFinal !== 'granted' && Platform.OS !== 'web') {
      Alert.alert('Atenção', 'As notificações de proximidade de reunião não funcionarão sem permissão.');
    }
  }

  return (
    <Stack screenOptions={{ 
      headerStyle: { backgroundColor: '#F0F4F8' },
      headerTintColor: '#102A43',
      headerTitleStyle: { fontWeight: 'bold' },
      headerBackTitle: 'Voltar',
    }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="sala/[id]" options={{ headerTitle: 'Agenda da Sala', headerShown: true }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
    </Stack>
  );
}