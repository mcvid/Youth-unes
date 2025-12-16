import { useEffect, useState } from 'react';

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) return null;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  };

  const showNotification = async (title: string, options?: { body?: string; url?: string; tag?: string; data?: Record<string, unknown> }) => {
    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    try {
      // Try using service worker notification first (works in background)
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag: options?.tag || 'youth-tunes',
        body: options?.body,
        data: { url: options?.url, ...options?.data }
      } as NotificationOptions);
      return true;
    } catch (error) {
      // Fallback to regular notification
      try {
        new Notification(title, {
          icon: '/favicon.png',
          body: options?.body
        });
        return true;
      } catch (fallbackError) {
        console.error('Notification error:', fallbackError);
        return false;
      }
    }
  };

  return {
    permission,
    isSupported,
    requestPermission,
    registerServiceWorker,
    showNotification
  };
};
