const REMINDER_TONE_FREQUENCY_HZ = 880
const REMINDER_TONE_DURATION_SECONDS = 0.2
const REMINDER_TONE_GAIN = 0.2

// Generates a short beep via the Web Audio API rather than shipping an audio
// file, since no sound asset exists in the project yet and this keeps the
// notification dependency-free.
export function playReminderSound() {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext
  if (!AudioContextClass) return

  const audioContext = new AudioContextClass()
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.frequency.value = REMINDER_TONE_FREQUENCY_HZ
  gainNode.gain.value = REMINDER_TONE_GAIN

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.start()
  oscillator.stop(audioContext.currentTime + REMINDER_TONE_DURATION_SECONDS)
  oscillator.onended = () => audioContext.close()
}
