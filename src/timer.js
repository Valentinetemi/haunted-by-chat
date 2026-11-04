const BEST_TIME_KEY = 'haunted-by-chat-best-time-ms'

function formatTime(milliseconds) {
  if (!Number.isFinite(milliseconds)) return '--:--.---'
  const totalSeconds = milliseconds / 1000
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const millisecondsPart = Math.floor(milliseconds % 1000)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millisecondsPart).padStart(3, '0')}`
}

function loadBestTime() {
  try {
    const value = Number.parseFloat(localStorage.getItem(BEST_TIME_KEY))
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

export function createRunTimer({ bestDisplay, finalDisplay, hudDisplay }) {
  let accumulatedTime = 0
  let bestTime = loadBestTime()
  let lastStartedAt = 0
  let running = false

  const currentTime = (now) => accumulatedTime + (running ? now - lastStartedAt : 0)

  const updateDisplays = (now = performance.now()) => {
    hudDisplay.textContent = formatTime(currentTime(now))
    bestDisplay.textContent = bestTime ? formatTime(bestTime) : 'No escape yet'
  }

  const pause = (now = performance.now()) => {
    if (!running) return
    accumulatedTime += now - lastStartedAt
    running = false
    updateDisplays(now)
  }

  const start = (now = performance.now()) => {
    if (running) return
    lastStartedAt = now
    running = true
  }

  const finish = (now = performance.now()) => {
    pause(now)
    const escapedIn = accumulatedTime
    const isNewBest = bestTime === null || escapedIn < bestTime
    if (isNewBest) {
      bestTime = escapedIn
      try {
        localStorage.setItem(BEST_TIME_KEY, String(bestTime))
      } catch {
        // The run still finishes when storage is unavailable or private.
      }
    }
    finalDisplay.textContent = `${formatTime(escapedIn)}${isNewBest ? ' · NEW BEST' : ''}`
    updateDisplays(now)
    return escapedIn
  }

  const reset = () => {
    accumulatedTime = 0
    lastStartedAt = 0
    running = false
    finalDisplay.textContent = '--:--.---'
    updateDisplays()
  }

  reset()
  return { finish, pause, reset, start, update: updateDisplays }
}
