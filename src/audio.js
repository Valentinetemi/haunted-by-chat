export function createAudioSystem() {
  let context = null
  let master = null
  let ambienceStarted = false

  const ensureContext = () => {
    if (!context) {
      context = new AudioContext()
      master = context.createGain()
      master.gain.value = 0.18
      master.connect(context.destination)
    }
    return context
  }

  const tone = (startFrequency, endFrequency, duration, volume, type = 'sine', delay = 0) => {
    const audioContext = ensureContext()
    const startAt = audioContext.currentTime + delay
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(startFrequency, startAt)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(endFrequency, 1), startAt + duration)
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
    oscillator.connect(gain).connect(master)
    oscillator.start(startAt)
    oscillator.stop(startAt + duration + 0.02)
  }

  const noise = (duration, volume, cutoff = 900, delay = 0) => {
    const audioContext = ensureContext()
    const length = Math.floor(audioContext.sampleRate * duration)
    const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1

    const source = audioContext.createBufferSource()
    const filter = audioContext.createBiquadFilter()
    const gain = audioContext.createGain()
    const startAt = audioContext.currentTime + delay
    filter.type = 'lowpass'
    filter.frequency.value = cutoff
    gain.gain.setValueAtTime(volume, startAt)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
    source.buffer = buffer
    source.connect(filter).connect(gain).connect(master)
    source.start(startAt)
  }

  const start = () => {
    const audioContext = ensureContext()
    audioContext.resume()
    if (ambienceStarted) return
    ambienceStarted = true

    for (const [frequency, volume] of [[42, 0.08], [57, 0.035]]) {
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gain.gain.value = volume
      oscillator.connect(gain).connect(master)
      oscillator.start()
    }
  }

  return {
    blaster() {
      tone(720, 95, 0.22, 0.18, 'sawtooth')
    },
    caught() {
      noise(0.65, 0.34, 1600)
      tone(130, 28, 1.15, 0.28, 'sawtooth')
    },
    flicker() {
      noise(0.12, 0.08, 2800)
      tone(95, 78, 0.2, 0.04, 'square')
    },
    mirror() {
      tone(980, 82, 0.72, 0.18, 'sawtooth')
      noise(0.42, 0.16, 2100, 0.05)
    },
    pickup() {
      tone(420, 840, 0.2, 0.16, 'sine')
      tone(630, 1260, 0.24, 0.1, 'sine', 0.08)
    },
    slam() {
      noise(0.35, 0.28, 420)
      tone(72, 34, 0.48, 0.25, 'triangle')
    },
    start,
    stun() {
      tone(1100, 180, 0.5, 0.2, 'square')
    },
    whisper() {
      noise(1.8, 0.055, 780)
      tone(94, 76, 1.6, 0.035, 'sine')
    },
  }
}
