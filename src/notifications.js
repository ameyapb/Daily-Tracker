const NOTIFICATION_PERMISSION = {
  DEFAULT: 'default',
  GRANTED: 'granted',
  DENIED: 'denied',
}

export function isNotificationSupported() {
  return 'Notification' in window
}

export function requestNotificationPermissionIfNeeded() {
  if (!isNotificationSupported()) return
  if (window.Notification.permission !== NOTIFICATION_PERMISSION.DEFAULT) return
  window.Notification.requestPermission()
}

export function showReminderNotification(card) {
  if (!isNotificationSupported()) return
  if (window.Notification.permission !== NOTIFICATION_PERMISSION.GRANTED) return

  const notification = new window.Notification(card.name, { body: card.description ?? undefined })
  notification.onclick = () => {
    window.focus()
    notification.close()
  }
}
