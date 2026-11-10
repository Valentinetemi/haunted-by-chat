export function createAudioSystem() {
  let context = null
  let master = null
  let ambienceStarted = false
  let lullabyGain = null
  let lullabyLead = null
  let lullabyShadow = null
  let lullabyNoteIndex = 0
  let nextLullabyNoteAt = 0
  let nextMotherClickAt = 0
  let nextWetDripAt = 0
  const lullabyNotes = [196, 220, 174.61, 146.83, 164.81, 130.81, 146.83, 98]

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

    lullabyGain = audioContext.createGain()
    lullabyGain.gain.value = 0.0001
    lullabyGain.connect(master)
    lullabyLead = audioContext.createOscillator()
    lullabyLead.type = 'triangle'
    lullabyLead.frequency.value = lullabyNotes[0]
    lullabyLead.connect(lullabyGain)
    lullabyLead.start()
    lullabyShadow = audioContext.createOscillator()
    lullabyShadow.type = 'sine'
    lullabyShadow.frequency.value = lullabyNotes[0] * 0.498
    lullabyShadow.detune.value = -17
    lullabyShadow.connect(lullabyGain)
    lullabyShadow.start()
  }

  const updateMother = (time, distance, isMoving, active) => {
    if (!context || !lullabyGain) return
    const proximity = active ? Math.max(0, Math.min(1, (18 - distance) / 16.5)) : 0
    const audioTime = context.currentTime
    lullabyGain.gain.setTargetAtTime(0.0001 + proximity ** 2 * 0.13, audioTime, 0.22)

    if (time >= nextLullabyNoteAt) {
      const frequency = lullabyNotes[lullabyNoteIndex % lullabyNotes.length]
      const brokenPitch = frequency * (lullabyNoteIndex % 5 === 4 ? 0.72 : 1)
      lullabyLead.frequency.setTargetAtTime(brokenPitch, audioTime, 0.08)
      lullabyShadow.frequency.setTargetAtTime(brokenPitch * 0.498, audioTime, 0.12)
      lullabyNoteIndex += 1
      nextLullabyNoteAt = time + 950 + Math.random() * 520
    }

    if (active && isMoving && time >= nextMotherClickAt) {
      tone(210 + Math.random() * 55, 72, 0.08, 0.025 + proximity * 0.075, 'square')
      nextMotherClickAt = time + 270 + (1 - proximity) * 390 + Math.random() * 90
    }

    if (active && time >= nextWetDripAt) {
      noise(0.09, 0.008 + proximity * 0.035, 330)
      tone(74, 46, 0.13, 0.008 + proximity * 0.025, 'sine')
      nextWetDripAt = time + 850 + Math.random() * 1450
    }
  }

  return {
    blaster() {
      tone(720, 95, 0.22, 0.18, 'sawtooth')
    },
    dryFire() {
      noise(0.04, 0.1, 1800)
      tone(1400, 420, 0.05, 0.06, 'square')
    },
    gunshot() {
      noise(0.09, 0.32, 2400)
      tone(210, 55, 0.16, 0.26, 'sawtooth')
      tone(90, 36, 0.28, 0.14, 'triangle', 0.015)
    },
    hit() {
      noise(0.07, 0.14, 900)
      tone(150, 64, 0.12, 0.1, 'square')
    },
    reload() {
      noise(0.05, 0.08, 1600)
      tone(240, 160, 0.07, 0.07, 'square', 0.1)
      tone(360, 220, 0.08, 0.06, 'square', 0.26)
    },
    crawl() {
      noise(0.55, 0.07, 420)
      tone(70, 48, 0.4, 0.03, 'triangle', 0.05)
      noise(0.3, 0.05, 300, 0.35)
    },
    caught() {
      noise(0.72, 0.52, 2600)
      tone(1380, 74, 0.54, 0.42, 'sawtooth')
      tone(170, 24, 1.15, 0.32, 'square', 0.04)
    },
    hint() {
      tone(520, 640, 0.12, 0.04, 'sine')
      tone(680, 760, 0.16, 0.03, 'sine', 0.08)
    },
    flicker() {
      noise(0.12, 0.08, 2800)
      tone(95, 78, 0.2, 0.04, 'square')
    },
    motherDeath() {
      noise(0.45, 0.28, 700)
      tone(380, 62, 0.9, 0.22, 'sawtooth')
      tone(150, 34, 1.15, 0.16, 'triangle', 0.06)
    },
    motherReturn() {
      tone(540, 120, 0.5, 0.2, 'sawtooth')
      noise(0.32, 0.16, 1500, 0.04)
    },
    mirror() {
      tone(980, 82, 0.72, 0.18, 'sawtooth')
      noise(0.42, 0.16, 2100, 0.05)
    },
    nearMiss() {
      tone(165, 320, 0.32, 0.12, 'triangle')
      tone(245, 490, 0.28, 0.08, 'sine', 0.09)
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
    updateMother,
    water() {
      noise(0.7, 0.05, 900)
      tone(620, 480, 0.35, 0.03, 'sine', 0.02)
    },
    whisper() {
      noise(1.8, 0.055, 780)
      tone(94, 76, 1.6, 0.035, 'sine')
    },
  }
}
