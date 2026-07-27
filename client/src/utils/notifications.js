export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function showNotification(title, body, icon = '/favicon.ico', onClick) {
  if (Notification.permission !== 'granted') return;

  const notif = new Notification(title, {
    body,
    icon,
    badge: icon,
    tag: 'finding-love-malawi',
    renotify: true,
  });

  if (onClick) {
    notif.onclick = (e) => {
      e.preventDefault();
      window.focus();
      onClick();
      notif.close();
    };
  }

  setTimeout(() => notif.close(), 8000);
}

export function notifyNewMatch(name, onNavigate) {
  showNotification(
    `New Match! 💖`,
    `You and ${name} liked each other! Say hello!`,
    undefined,
    onNavigate
  );
}

export function notifyNewMessage(senderName, message, onNavigate) {
  showNotification(
    `New message from ${senderName}`,
    message.length > 80 ? message.substring(0, 80) + '...' : message,
    undefined,
    onNavigate
  );
}
