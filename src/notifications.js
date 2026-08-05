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

const REMINDER_SUMMARY_NOTIFICATION_TAG = 'reminder-summary'

function reminderSummaryBody(count) {
  return count === 1 ? 'You have 1 reminder due' : `You have ${count} reminders due`
}

export function showReminderSummaryNotification(count) {
  if (!isNotificationSupported()) return undefined
  if (window.Notification.permission !== NOTIFICATION_PERMISSION.GRANTED) return undefined

  const notification = new window.Notification(reminderSummaryBody(count), {
    tag: REMINDER_SUMMARY_NOTIFICATION_TAG,
  })
  notification.onclick = () => {
    window.focus()
    notification.close()
  }
  return notification
}
