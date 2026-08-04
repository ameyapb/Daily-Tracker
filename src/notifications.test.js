import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isNotificationSupported, requestNotificationPermissionIfNeeded, showReminderNotification } from './notifications'

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

describe('showReminderNotification', () => {
  afterEach(() => {
    delete window.Notification
  })

  it('does nothing when Notification is unsupported', () => {
    delete window.Notification
    expect(() => showReminderNotification({ name: 'Water plants' })).not.toThrow()
  })

  it('does nothing when permission is default', () => {
    const NotificationMock = installMockNotification({ permission: 'default' })
    showReminderNotification({ name: 'Water plants' })
    expect(NotificationMock).not.toHaveBeenCalled()
  })

  it('does nothing when permission is denied', () => {
    const NotificationMock = installMockNotification({ permission: 'denied' })
    showReminderNotification({ name: 'Water plants' })
    expect(NotificationMock).not.toHaveBeenCalled()
  })

  it('constructs a Notification with the card name and description when granted', () => {
    const NotificationMock = installMockNotification({ permission: 'granted' })
    showReminderNotification({ name: 'Water plants', description: 'Use the blue can' })
    expect(NotificationMock).toHaveBeenCalledWith('Water plants', { body: 'Use the blue can' })
  })

  it('omits body when the card has no description', () => {
    const NotificationMock = installMockNotification({ permission: 'granted' })
    showReminderNotification({ name: 'Water plants', description: null })
    expect(NotificationMock).toHaveBeenCalledWith('Water plants', { body: undefined })
  })

  it('wires onclick to focus the window and close the notification', () => {
    const NotificationMock = installMockNotification({ permission: 'granted' })
    const notificationInstance = { onclick: null, close: vi.fn() }
    NotificationMock.mockImplementation(function() { return notificationInstance })
    window.focus = vi.fn()

    showReminderNotification({ name: 'Water plants' })
    notificationInstance.onclick()

    expect(window.focus).toHaveBeenCalledTimes(1)
    expect(notificationInstance.close).toHaveBeenCalledTimes(1)
  })
})
