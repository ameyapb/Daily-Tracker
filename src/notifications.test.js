import { describe, it, expect, vi, afterEach } from 'vitest'
import { isNotificationSupported, requestNotificationPermissionIfNeeded, showReminderSummaryNotification } from './notifications'

function installMockNotification({ permission, requestPermission } = {}) {
  const NotificationMock = vi.fn()
  NotificationMock.permission = permission
  NotificationMock.requestPermission = requestPermission ?? vi.fn()
  window.Notification = NotificationMock
  return NotificationMock
}

describe('isNotificationSupported', () => {
  afterEach(() => {
    delete window.Notification
  })

  it('returns true when Notification exists on window', () => {
    installMockNotification({ permission: 'default' })
    expect(isNotificationSupported()).toBe(true)
  })

  it('returns false when Notification does not exist on window', () => {
    delete window.Notification
    expect(isNotificationSupported()).toBe(false)
  })
})

describe('requestNotificationPermissionIfNeeded', () => {
  afterEach(() => {
    delete window.Notification
  })

  it('does nothing when Notification is unsupported', () => {
    delete window.Notification
    expect(() => requestNotificationPermissionIfNeeded()).not.toThrow()
  })

  it('requests permission when permission is default', () => {
    const requestPermission = vi.fn()
    installMockNotification({ permission: 'default', requestPermission })

    requestNotificationPermissionIfNeeded()

    expect(requestPermission).toHaveBeenCalledTimes(1)
  })

  it('does not request permission when already granted', () => {
    const requestPermission = vi.fn()
    installMockNotification({ permission: 'granted', requestPermission })

    requestNotificationPermissionIfNeeded()

    expect(requestPermission).not.toHaveBeenCalled()
  })

  it('does not request permission when already denied', () => {
    const requestPermission = vi.fn()
    installMockNotification({ permission: 'denied', requestPermission })

    requestNotificationPermissionIfNeeded()

    expect(requestPermission).not.toHaveBeenCalled()
  })
})

describe('showReminderSummaryNotification', () => {
  afterEach(() => {
    delete window.Notification
  })

  it('does nothing when Notification is unsupported', () => {
    delete window.Notification
    expect(() => showReminderSummaryNotification(1)).not.toThrow()
  })

  it('returns undefined when Notification is unsupported', () => {
    delete window.Notification
    expect(showReminderSummaryNotification(1)).toBeUndefined()
  })

  it('does nothing when permission is default', () => {
    const NotificationMock = installMockNotification({ permission: 'default' })
    showReminderSummaryNotification(1)
    expect(NotificationMock).not.toHaveBeenCalled()
  })

  it('does nothing when permission is denied', () => {
    const NotificationMock = installMockNotification({ permission: 'denied' })
    showReminderSummaryNotification(1)
    expect(NotificationMock).not.toHaveBeenCalled()
  })

  it('uses singular body text for a count of 1', () => {
    const NotificationMock = installMockNotification({ permission: 'granted' })
    showReminderSummaryNotification(1)
    expect(NotificationMock).toHaveBeenCalledWith('You have 1 reminder due', { tag: 'reminder-summary' })
  })

  it('uses plural body text for a count greater than 1', () => {
    const NotificationMock = installMockNotification({ permission: 'granted' })
    showReminderSummaryNotification(3)
    expect(NotificationMock).toHaveBeenCalledWith('You have 3 reminders due', { tag: 'reminder-summary' })
  })

  it('always uses the same tag so repeated calls replace rather than stack', () => {
    const NotificationMock = installMockNotification({ permission: 'granted' })
    showReminderSummaryNotification(1)
    showReminderSummaryNotification(2)
    expect(NotificationMock).toHaveBeenNthCalledWith(1, 'You have 1 reminder due', { tag: 'reminder-summary' })
    expect(NotificationMock).toHaveBeenNthCalledWith(2, 'You have 2 reminders due', { tag: 'reminder-summary' })
  })

  it('returns the created notification instance', () => {
    const NotificationMock = installMockNotification({ permission: 'granted' })
    const notificationInstance = { onclick: null, close: vi.fn() }
    NotificationMock.mockImplementation(function() { return notificationInstance })

    expect(showReminderSummaryNotification(1)).toBe(notificationInstance)
  })

  it('wires onclick to focus the window and close the notification', () => {
    const NotificationMock = installMockNotification({ permission: 'granted' })
    const notificationInstance = { onclick: null, close: vi.fn() }
    NotificationMock.mockImplementation(function() { return notificationInstance })
    window.focus = vi.fn()

    showReminderSummaryNotification(1)
    notificationInstance.onclick()

    expect(window.focus).toHaveBeenCalledTimes(1)
    expect(notificationInstance.close).toHaveBeenCalledTimes(1)
  })
})
