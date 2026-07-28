import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';

function showBrowserNotification(title, body) {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    new Notification(title, { body, icon: '/icon-192.svg' });
  } catch (err) {
    console.error('Notification error:', err.message);
  }
}

function shouldNotify() {
  const enabled = localStorage.getItem('notifications_enabled');
  if (enabled === 'true') return true;
  return document.hidden;
}

async function registerPushSubscription() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const res = await fetch('/api/push/vapid-public-key');
    if (!res.ok) return;
    const { publicKey } = await res.json();
    if (!publicKey) return;

    const existingSub = await reg.pushManager.getSubscription();
    if (existingSub) {
      const sub = existingSub.toJSON();
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        }),
      });
      return;
    }

    const convertedKey = urlBase64ToUint8Array(publicKey);
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey,
    });

    const subJson = subscription.toJSON();
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
      }),
    });
  } catch (err) {
    console.error('Push registration error:', err.message);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function useNotifications() {
  const [permission, setPermission] = useState(() => {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });
  const [notifications, setNotifications] = useState({
    unreadMessages: 0, newMatches: 0, newLikes: 0, total: 0,
  });
  const prevRef = useRef({ messages: 0, matches: 0, likes: 0 });

  const requestPermission = useCallback(async () => {
    try {
      if (!('Notification' in window)) return 'unsupported';
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        registerPushSubscription();
      }
      return result;
    } catch (err) {
      console.error('Permission request error:', err.message);
      return 'denied';
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.notifications.get();
      const prev = prevRef.current;

      const msgs = data.unreadMessages || 0;
      const matches = data.newMatches || 0;
      const likes = data.newLikes || 0;

      if (shouldNotify()) {
        if (matches > prev.matches) {
          showBrowserNotification('🎉 New Match!', 'Someone liked you back!');
        }
        if (msgs > prev.messages) {
          const diff = msgs - prev.messages;
          showBrowserNotification('💬 New messages', `You have ${diff} unread ${diff === 1 ? 'message' : 'messages'}`);
        }
        if (likes > prev.likes) {
          const diff = likes - prev.likes;
          showBrowserNotification('❤️ Someone liked you!', `${diff} new ${diff === 1 ? 'person' : 'people'} liked your profile`);
        }
      }

      prevRef.current = { messages: msgs, matches, likes };

      setNotifications({
        unreadMessages: msgs,
        newMatches: matches,
        newLikes: likes,
        total: data.total || 0,
      });
    } catch (err) {
      console.error('Failed to fetch notifications:', err.message);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!('Notification' in window)) { setPermission('unsupported'); return; }
    setPermission(Notification.permission);
    if (Notification.permission === 'granted') {
      registerPushSubscription();
    }
    fetchNotifications();
    const interval = setInterval(() => { if (!document.hidden && localStorage.getItem('token')) fetchNotifications(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return { permission, requestPermission, notifications, totalUnread: notifications.total };
}
