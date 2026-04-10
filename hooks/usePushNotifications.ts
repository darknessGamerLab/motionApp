import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';

export function usePushNotifications() {
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    async function requestUserPermission() {
      if (Platform.OS === 'web') return;
      
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Bildirim izni durumu:', authStatus);
        getFcmToken();
      }
    }

    async function getFcmToken() {
      try {
        const token = await messaging().getToken();
        console.log('FCM Token:', token);
        setFcmToken(token);
      } catch (error) {
        console.error('FCM Token alınamadı:', error);
      }
    }

    requestUserPermission();

    // Uygulama açıkken (Foreground) bildirim geldiğinde tetiklenir
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('Ön Planda Bildirim Geldi!', JSON.stringify(remoteMessage));

      const channelId = await notifee.createChannel({
        id: 'default',
        name: 'Genel Bildirimler',
        importance: AndroidImportance.HIGH,
      });

      await notifee.displayNotification({
        title: remoteMessage.notification?.title || 'Yeni Mesaj',
        body: remoteMessage.notification?.body || '',
        android: {
          channelId,
          smallIcon: 'ic_launcher', // Eğer hata verirse '@mipmap/ic_launcher' yapabilirsiniz
          pressAction: {
            id: 'default',
          },
        },
      });
    });

    return unsubscribe;
  }, []);

  return { fcmToken };
}
