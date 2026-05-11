/**
 * Firebase Cloud Messaging (FCM) Client Utilities
 * 
 * Handles browser push notifications for admin dashboard.
 * Provides functions to request permission and listen for messages.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging, MessagePayload } from 'firebase/messaging';

// Firebase configuration
// NOTE: These are client-side safe (NEXT_PUBLIC_) environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// VAPID key for web push (get from Firebase Console → Project Settings → Cloud Messaging)
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

/**
 * Initialize Firebase app (only once)
 */
function initializeFirebase(): FirebaseApp {
  if (!app) {
    // Check if Firebase is already initialized
    const existingApps = getApps();
    if (existingApps.length > 0) {
      app = existingApps[0];
    } else {
      app = initializeApp(firebaseConfig);
    }
  }
  return app;
}

/**
 * Get Firebase Messaging instance
 */
function getMessagingInstance(): Messaging | null {
  // Check if running in browser
  if (typeof window === 'undefined') {
    console.warn('FCM: Not running in browser environment');
    return null;
  }

  // Check if service workers are supported
  if (!('serviceWorker' in navigator)) {
    console.warn('FCM: Service workers not supported in this browser');
    return null;
  }

  // Check if Notification API is supported
  if (!('Notification' in window)) {
    console.warn('FCM: Notifications not supported in this browser');
    return null;
  }

  if (!messaging) {
    const firebaseApp = initializeFirebase();
    messaging = getMessaging(firebaseApp);
  }

  return messaging;
}

/**
 * Request browser notification permission and get FCM token
 * 
 * @returns FCM token if permission granted, null otherwise
 */
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    const messagingInstance = getMessagingInstance();
    if (!messagingInstance) {
      return null;
    }

    // Check current permission status
    if (Notification.permission === 'granted') {
      console.log('FCM: Notification permission already granted');
    } else if (Notification.permission === 'denied') {
      console.warn('FCM: Notification permission denied by user');
      return null;
    } else {
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('FCM: Notification permission not granted');
        return null;
      }
      console.log('FCM: Notification permission granted');
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('FCM: Service worker registered:', registration);

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    // Get FCM token
    const token = await getToken(messagingInstance, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log('FCM: Token obtained:', token);
      return token;
    } else {
      console.warn('FCM: No registration token available');
      return null;
    }
  } catch (error) {
    console.error('FCM: Error requesting notification permission:', error);
    return null;
  }
}

/**
 * Listen for foreground messages (when app is open)
 * 
 * @param callback - Function to call when message is received
 * @returns Unsubscribe function
 */
export function onMessageListener(callback: (payload: MessagePayload) => void): (() => void) | null {
  try {
    const messagingInstance = getMessagingInstance();
    if (!messagingInstance) {
      return null;
    }

    // Listen for foreground messages
    const unsubscribe = onMessage(messagingInstance, (payload) => {
      console.log('FCM: Foreground message received:', payload);
      callback(payload);
    });

    return unsubscribe;
  } catch (error) {
    console.error('FCM: Error setting up message listener:', error);
    return null;
  }
}

/**
 * Show browser notification manually (for foreground messages)
 * 
 * @param title - Notification title
 * @param options - Notification options
 */
export function showNotification(title: string, options?: NotificationOptions): void {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/icon.png',
      badge: '/badge.png',
      tag: 'order-notification',
      requireInteraction: true,
      ...options
    });
  }
}

/**
 * Check if notifications are supported and enabled
 * 
 * @returns true if notifications are supported and permission is granted
 */
export function areNotificationsEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    Notification.permission === 'granted'
  );
}

/**
 * Get current notification permission status
 * 
 * @returns 'granted', 'denied', 'default', or 'unsupported'
 */
export function getNotificationPermissionStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  return Notification.permission;
}
